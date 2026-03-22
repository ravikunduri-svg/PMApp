/**
 * Groq LLM calls — scoring + JD parsing.
 * All server-side only.
 */
import Groq from 'groq-sdk'
import { z } from 'zod'
import type { Dimension } from './questions'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ── Scoring ───────────────────────────────────────────────────────────────────

const ScoreSchema = z.object({
  scores: z.object({
    problem_framing: z.number().min(1).max(10).nullable(),
    user_empathy: z.number().min(1).max(10).nullable(),
    structured_thinking: z.number().min(1).max(10).nullable(),
    prioritization: z.number().min(1).max(10).nullable(),
    metrics_reasoning: z.number().min(1).max(10).nullable(),
    communication_clarity: z.number().min(1).max(10).nullable(),
  }),
  feedback: z.record(z.string(), z.string()).optional().default({}),
  overall_score: z.number().min(1).max(10),
  top_strength: z.string(),
  biggest_gap: z.string(),
  improvement_tip: z.string(),
})

export type ScoringResult = z.infer<typeof ScoreSchema>

export async function scoreAnswer(
  questionText: string,
  answer: string,
  dimensionsTested: Dimension[],
  idealAnswerOutline?: string,
  archetype?: string
): Promise<ScoringResult> {
  const dimensionsStr = dimensionsTested.join(', ')
  const archetypeNote = archetype
    ? `The candidate is a ${archetype.toUpperCase()} PM candidate. Weight dimensions accordingly.`
    : ''

  const prompt = `You are a senior PM interviewer scoring a candidate's answer.

Question: ${questionText}

Candidate's answer: ${answer}

${idealAnswerOutline ? `Ideal answer outline: ${idealAnswerOutline}` : ''}

Dimensions to score (only score these, return null for others): ${dimensionsStr}
${archetypeNote}

Score each dimension on a 1-10 scale (1 = very weak, 10 = exceptional). Only score the dimensions listed above — return null for all others.

Return ONLY valid JSON matching this exact schema:
{
  "scores": {
    "problem_framing": <number 1-10 or null>,
    "user_empathy": <number 1-10 or null>,
    "structured_thinking": <number 1-10 or null>,
    "prioritization": <number 1-10 or null>,
    "metrics_reasoning": <number 1-10 or null>,
    "communication_clarity": <number 1-10 or null>
  },
  "feedback": {
    "<dimension>": "<1-2 sentence specific feedback>",
    ... (only for scored dimensions)
  },
  "overall_score": <weighted average of scored dimensions, 1-10>,
  "top_strength": "<one sentence on what they did best>",
  "biggest_gap": "<one sentence on the biggest weakness>",
  "improvement_tip": "<one concrete actionable tip>"
}`

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0].message.content ?? '{}'
  const parsed = JSON.parse(raw)
  return ScoreSchema.parse(parsed)
}

// ── JD Parsing ────────────────────────────────────────────────────────────────

const JDSchema = z.object({
  parsed_role: z.string(),
  role_requirements: z.object({
    problem_framing: z.number().min(1).max(10),
    user_empathy: z.number().min(1).max(10),
    structured_thinking: z.number().min(1).max(10),
    prioritization: z.number().min(1).max(10),
    metrics_reasoning: z.number().min(1).max(10),
    communication_clarity: z.number().min(1).max(10),
  }),
  inferred_archetype: z.enum(['consumer', 'b2b', 'technical']),
})

export type JDResult = z.infer<typeof JDSchema>

export async function parseJobDescription(jdText: string): Promise<JDResult> {
  const prompt = `You are a PM hiring expert. Analyze this job description and extract requirements.

Job Description:
${jdText}

For each of the 6 PM dimensions, estimate how important this dimension is for this role (1 = rarely needed, 10 = critical differentiator).

PM Dimensions:
- problem_framing: Scoping and reframing before jumping to solutions
- user_empathy: Behavioral user understanding (not demographic)
- structured_thinking: Logical organization of thought
- prioritization: Hard choices + explicit tradeoffs
- metrics_reasoning: Meaningful success metrics
- communication_clarity: Clear, concise, compelling communication

Also classify the archetype: consumer (B2C), b2b (Enterprise/SaaS), or technical (developer tools, infra, API products).

Return ONLY valid JSON:
{
  "parsed_role": "<company name + role title, e.g. Swiggy - Senior Product Manager, Growth>",
  "role_requirements": {
    "problem_framing": <1-10>,
    "user_empathy": <1-10>,
    "structured_thinking": <1-10>,
    "prioritization": <1-10>,
    "metrics_reasoning": <1-10>,
    "communication_clarity": <1-10>
  },
  "inferred_archetype": "<consumer|b2b|technical>"
}`

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0].message.content ?? '{}'
  const parsed = JSON.parse(raw)
  return JDSchema.parse(parsed)
}

// ── Score aggregation helper ──────────────────────────────────────────────────

type DimScores = Record<Dimension, number | null>

export function aggregateScores(questionResults: { scores: Partial<DimScores> }[]): Partial<DimScores> {
  const totals: Record<string, { sum: number; count: number }> = {}

  for (const result of questionResults) {
    for (const [dim, score] of Object.entries(result.scores)) {
      if (score === null || score === undefined) continue
      if (!totals[dim]) totals[dim] = { sum: 0, count: 0 }
      totals[dim].sum += score as number
      totals[dim].count++
    }
  }

  const result: Partial<DimScores> = {}
  for (const [dim, { sum, count }] of Object.entries(totals)) {
    result[dim as Dimension] = Math.round((sum / count) * 10) / 10
  }
  return result
}

export function computeReadiness(
  userScores: Partial<DimScores>,
  roleRequirements: Record<Dimension, number>
): {
  gap_analysis: { dimension: Dimension; user_score: number; required: number; gap: number }[]
  readiness_pct: number
  recommendation: 'ready' | 'almost' | 'not_yet'
} {
  const dimensions: Dimension[] = [
    'problem_framing', 'user_empathy', 'structured_thinking',
    'prioritization', 'metrics_reasoning', 'communication_clarity',
  ]

  const gap_analysis = dimensions.map((dim) => {
    const user_score = userScores[dim] ?? 5
    const required = roleRequirements[dim]
    return { dimension: dim, user_score, required, gap: required - user_score }
  })

  const totalGap = gap_analysis.reduce((sum, r) => sum + Math.max(0, r.gap), 0)
  const maxPossibleGap = dimensions.reduce((sum, dim) => sum + Math.max(0, roleRequirements[dim] - 1), 0)
  const readiness_pct = Math.round(Math.max(0, (1 - totalGap / maxPossibleGap) * 100))

  const recommendation: 'ready' | 'almost' | 'not_yet' =
    readiness_pct >= 80 ? 'ready' : readiness_pct >= 60 ? 'almost' : 'not_yet'

  return { gap_analysis, readiness_pct, recommendation }
}
