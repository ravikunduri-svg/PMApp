import fs from 'fs'
import path from 'path'

// Data directory — bundled inside the app for deployment compatibility
const DATA_DIR = path.join(process.cwd(), 'data')

export type Dimension =
  | 'problem_framing'
  | 'user_empathy'
  | 'structured_thinking'
  | 'prioritization'
  | 'metrics_reasoning'
  | 'communication_clarity'

export type AnswerMode = 'mcq' | 'text' | 'voice'
export type Difficulty = 'beginner' | 'easy' | 'intermediate' | 'medium' | 'advanced' | 'hard'
export type Archetype = 'consumer' | 'b2b' | 'technical' | 'foundation' | 'shared'

export type MCQOption = {
  option: string
  text: string
  is_correct: boolean
  explanation: string
}

export type NormalizedQuestion = {
  id: string
  text: string
  dimensions: Dimension[]
  answer_mode: AnswerMode
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  archetype: Archetype
  mcq_options: MCQOption[] | null
  time_limit_seconds: number
  ideal_answer_outline?: string
}

function normalizeDifficulty(d: string): 'beginner' | 'intermediate' | 'advanced' {
  if (d === 'easy' || d === 'beginner') return 'beginner'
  if (d === 'hard' || d === 'advanced') return 'advanced'
  return 'intermediate'
}

function normalizeDimensions(q: Record<string, unknown>): Dimension[] {
  // Some files use dimensions_tested, others use scoring_emphasis
  if (Array.isArray(q.dimensions_tested)) return q.dimensions_tested as Dimension[]
  if (q.scoring_emphasis && typeof q.scoring_emphasis === 'object') {
    const se = q.scoring_emphasis as Record<string, string>
    const dims: Dimension[] = []
    if (se.primary) dims.push(se.primary as Dimension)
    if (se.secondary) dims.push(se.secondary as Dimension)
    return dims
  }
  return ['structured_thinking']
}

function normalizeAnswerMode(q: Record<string, unknown>): AnswerMode {
  if (q.answer_mode === 'mcq' || q.type === 'mcq') return 'mcq'
  if (q.answer_mode === 'voice') return 'voice'
  if (Array.isArray(q.mcq_options) && q.mcq_options.length > 0) return 'mcq'
  return 'text'
}

function parseFile(filename: string, archetypeOverride?: Archetype): NormalizedQuestion[] {
  const filepath = path.join(DATA_DIR, filename)
  if (!fs.existsSync(filepath)) return []

  const raw = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
  const questions: Record<string, unknown>[] = raw.questions ?? []
  const fileArchetype: Archetype = archetypeOverride ?? (raw.archetype as Archetype) ?? 'shared'

  return questions.map((q) => ({
    id: q.id as string,
    text: q.text as string,
    dimensions: normalizeDimensions(q),
    answer_mode: normalizeAnswerMode(q),
    difficulty: normalizeDifficulty(q.difficulty as string),
    archetype: fileArchetype,
    mcq_options: (q.mcq_options as MCQOption[] | null) ?? null,
    time_limit_seconds: (q.time_limit_seconds != null ? q.time_limit_seconds as number : q.time_limit_minutes != null ? (q.time_limit_minutes as number) * 60 : 300),
    ideal_answer_outline: q.ideal_answer_outline as string | undefined,
  }))
}

let _cache: NormalizedQuestion[] | null = null

export function getAllQuestions(): NormalizedQuestion[] {
  if (_cache) return _cache

  const questions = [
    ...parseFile('questions-foundation.json', 'foundation'),
    ...parseFile('questions-shared-v2.json', 'shared'),
    ...parseFile('questions-b2b-v2.json', 'b2b'),
    ...parseFile('questions-technical-v2.json', 'technical'),
  ]

  // Deduplicate by id
  const seen = new Set<string>()
  _cache = questions.filter((q) => {
    if (seen.has(q.id)) return false
    seen.add(q.id)
    return true
  })
  return _cache
}

export function getQuestionsByArchetype(archetype: Archetype): NormalizedQuestion[] {
  return getAllQuestions().filter(
    (q) => q.archetype === archetype || q.archetype === 'foundation' || q.archetype === 'shared'
  )
}

export function getQuestionById(id: string): NormalizedQuestion | undefined {
  return getAllQuestions().find((q) => q.id === id)
}
