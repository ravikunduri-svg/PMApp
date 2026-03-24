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

// ── Resume Critique ───────────────────────────────────────────────────────────

const ResumeDimSchema = z.object({
  score: z.number().min(1).max(10),
  feedback: z.string(),
  example_from_resume: z.string().optional(),
  suggested_rewrite: z.string().optional(),
})

const ResumeCritiqueSchema = z.object({
  overall_signal: z.enum(['pm_ready', 'needs_work', 'not_yet']),
  overall_score: z.number().min(1).max(10),
  summary: z.string(),
  dimensions: z.object({
    impact_framing: ResumeDimSchema,
    quantification: ResumeDimSchema,
    pm_narrative: ResumeDimSchema,
    cross_functional: ResumeDimSchema,
    transition_readiness: ResumeDimSchema,
  }),
  top_strength: z.string(),
  biggest_gap: z.string(),
  rewrites: z.array(z.object({
    original: z.string(),
    improved: z.string(),
    why: z.string(),
  })).max(3),
  next_actions: z.array(z.string()).max(4),
})

export type ResumeCritiqueResult = z.infer<typeof ResumeCritiqueSchema>

export async function critiqueResume(resumeText: string): Promise<ResumeCritiqueResult> {
  const prompt = `You are a senior PM hiring manager who has reviewed thousands of resumes for product management roles. Analyze this resume with honest, specific, and actionable feedback.

RESUME:
${resumeText}

EVALUATE THESE 5 PM-SPECIFIC DIMENSIONS (score 1-10 each):

1. IMPACT_FRAMING: Does the resume show product outcomes, not just activities?
   - Weak (1-3): "Led team", "Worked on mobile app", "Responsible for roadmap" — all activity, no impact
   - Good (4-6): Mentions results but vaguely ("improved engagement", "grew the team")
   - Strong (7-10): "Launched X that drove 23% lift in day-7 retention", "Cut support tickets 40% by shipping Y"

2. QUANTIFICATION: Are results backed with real numbers — scale, growth, time?
   - Weak (1-3): No numbers anywhere. Pure narrative.
   - Good (4-6): Some numbers but mixed with vague claims
   - Strong (7-10): Almost every achievement has a number: users, %, time saved, revenue, NPS

3. PM_NARRATIVE: Does this tell a coherent story of someone who thinks like a PM?
   - Weak (1-3): Looks like an ops or eng resume with no product thinking visible
   - Good (4-6): Some PM keywords but reads like a task list, not a strategic story
   - Strong (7-10): Shows the full cycle: user insight → prioritization → launch → measurement. Even if implicit.

4. CROSS_FUNCTIONAL: Does this show working with engineering, design, data, sales?
   - Weak (1-3): Silo work, no mention of cross-functional collaboration
   - Good (4-6): Mentions working with other teams but no specifics
   - Strong (7-10): Names specific cross-functional outcomes — "aligned 3 eng teams", "led design sprint with 2 designers"

5. TRANSITION_READINESS (especially for career switchers): Is the PM story clear?
   - Weak (1-3): Nothing connects past experience to PM. No PM-adjacent projects, courses, or reframing.
   - Good (4-6): Some PM keywords but unclear pivot narrative
   - Strong (7-10): Clear bridge — volunteer PM work, side products, internal rotations, PM coursework, visible PM thinking in past roles

IMPORTANT CALIBRATION: Be honest. This person's job search depends on accurate feedback. Average work gets 4-6. A polished PM resume gets 7-8. An exceptional one gets 9-10. Do not inflate scores.

REWRITES: Pick 2-3 actual bullet points or lines from the resume that most need improvement. Show the original, write an improved version, and explain why.

NEXT_ACTIONS: Give 3-4 specific, actionable steps this person should take before sending this resume again.

Return ONLY valid JSON, no markdown, no backticks:
{
  "overall_signal": "pm_ready" | "needs_work" | "not_yet",
  "overall_score": <1-10>,
  "summary": "<2-3 sentence honest overall assessment>",
  "dimensions": {
    "impact_framing": { "score": <1-10>, "feedback": "<2-3 sentences>", "example_from_resume": "<quote from their resume if possible>", "suggested_rewrite": "<how to fix the example>" },
    "quantification": { "score": <1-10>, "feedback": "<2-3 sentences>", "example_from_resume": "<quote>", "suggested_rewrite": "<improvement>" },
    "pm_narrative": { "score": <1-10>, "feedback": "<2-3 sentences>" },
    "cross_functional": { "score": <1-10>, "feedback": "<2-3 sentences>" },
    "transition_readiness": { "score": <1-10>, "feedback": "<2-3 sentences>" }
  },
  "top_strength": "<1-2 sentences on the best element>",
  "biggest_gap": "<1-2 sentences on the most critical thing to fix>",
  "rewrites": [
    { "original": "<exact text from resume>", "improved": "<better version>", "why": "<1 sentence explanation>" }
  ],
  "next_actions": ["<specific action 1>", "<specific action 2>", "<specific action 3>"]
}`

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0].message.content ?? '{}'
  const parsed = JSON.parse(raw)
  return ResumeCritiqueSchema.parse(parsed)
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
