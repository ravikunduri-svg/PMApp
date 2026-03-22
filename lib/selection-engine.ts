/**
 * Selection Engine — pure logic, no API calls.
 * Picks 5 personalized questions based on weakest dimensions.
 *
 * Rules (from selection-engine-spec.md):
 * - Remove mastered questions (score ≥ 7)
 * - Relevance = sum of gaps across question's tested dimensions
 * - Match difficulty to user's current level
 * - Final 5 must include: ≥1 MCQ, ≥1 voice (downgraded to text for MVP), ≥1 text
 * - No two questions can test identical dimension sets
 */

import { type NormalizedQuestion, type Dimension, getQuestionsByArchetype } from './questions'

export type DimensionScores = Record<Dimension, number>

type Level = 'beginner' | 'intermediate' | 'advanced'

const MASTERY_THRESHOLD = 7

function avgScore(scores: Partial<DimensionScores>): number {
  const vals = Object.values(scores).filter((v): v is number => v !== null && v !== undefined)
  if (vals.length === 0) return 5
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function userLevel(scores: Partial<DimensionScores>): Level {
  const avg = avgScore(scores)
  if (avg < 4) return 'beginner'
  if (avg < 7) return 'intermediate'
  return 'advanced'
}

function relevanceScore(q: NormalizedQuestion, scores: Partial<DimensionScores>): number {
  return q.dimensions.reduce((sum, dim) => {
    const score = scores[dim] ?? 5
    return sum + Math.max(0, 10 - score) // gap = 10 - score
  }, 0)
}

function dimensionSetKey(dims: Dimension[]): string {
  return [...dims].sort().join('|')
}

export function selectQuestions(
  archetype: 'consumer' | 'b2b' | 'technical',
  currentScores: Partial<DimensionScores> = {},
  masteredIds: string[] = []
): NormalizedQuestion[] {
  const pool = getQuestionsByArchetype(archetype).filter(
    (q) => !masteredIds.includes(q.id)
  )

  const level = userLevel(currentScores)

  // Score each question by relevance
  const scored = pool
    .map((q) => ({ q, score: relevanceScore(q, currentScores) }))
    .sort((a, b) => b.score - a.score)

  const selected: NormalizedQuestion[] = []
  const usedDimSets = new Set<string>()
  let mcqCount = 0
  let textCount = 0

  // Prefer difficulty-matched questions but fall back to any
  const difficultyOrder: Level[] = level === 'beginner'
    ? ['beginner', 'intermediate', 'advanced']
    : level === 'intermediate'
    ? ['intermediate', 'beginner', 'advanced']
    : ['advanced', 'intermediate', 'beginner']

  const sortedByDiff = [...scored].sort((a, b) => {
    const ai = difficultyOrder.indexOf(a.q.difficulty as Level)
    const bi = difficultyOrder.indexOf(b.q.difficulty as Level)
    if (ai !== bi) return ai - bi
    return b.score - a.score // tiebreak by relevance
  })

  for (const { q } of sortedByDiff) {
    if (selected.length >= 5) break

    const dimKey = dimensionSetKey(q.dimensions)
    if (usedDimSets.has(dimKey)) continue
    usedDimSets.add(dimKey)

    selected.push(q)
    if (q.answer_mode === 'mcq') mcqCount++
    if (q.answer_mode === 'text') textCount++
  }

  // Ensure at least 1 MCQ
  if (mcqCount === 0) {
    const mcqCandidate = pool.find(
      (q) => q.answer_mode === 'mcq' && !selected.find((s) => s.id === q.id)
    )
    if (mcqCandidate && selected.length > 0) {
      selected.splice(selected.length - 1, 1, mcqCandidate) // replace last
    }
  }

  // Ensure at least 1 text
  if (textCount === 0) {
    const textCandidate = pool.find(
      (q) => q.answer_mode === 'text' && !selected.find((s) => s.id === q.id)
    )
    if (textCandidate && selected.length > 1) {
      selected.splice(selected.length - 1, 1, textCandidate)
    }
  }

  return selected.slice(0, 5)
}

export function getMasteredQuestionIds(
  questionResults: { question_id: string; overall_score: number }[]
): string[] {
  return questionResults
    .filter((r) => r.overall_score >= MASTERY_THRESHOLD)
    .map((r) => r.question_id)
}
