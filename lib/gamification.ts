// Pure logic — no server-only imports at top level.
// adminClient is injected as a parameter to awardXP to avoid circular imports.
import type { SupabaseClient } from '@supabase/supabase-js'

// ── XP per action ─────────────────────────────────────────────────────────────
export const XP_PER_ACTION = {
  drill: 10,
  full_test: 50,
  module_complete: 20,
  dimension_mastery: 100,
} as const

// ── Level thresholds ──────────────────────────────────────────────────────────
const LEVEL_THRESHOLDS = [
  { level: 1, name: 'Aspiring PM',      minXp: 0 },
  { level: 2, name: 'PM Trainee',       minXp: 100 },
  { level: 3, name: 'PM Practitioner',  minXp: 300 },
  { level: 4, name: 'PM Candidate',     minXp: 600 },
  { level: 5, name: 'PM Ready',         minXp: 1000 },
]

export interface LevelInfo {
  level: number
  name: string
  minXp: number
  nextMinXp: number | null
  progress: number // 0–100 within this level band
}

export function computeLevel(xp: number): LevelInfo {
  let current = LEVEL_THRESHOLDS[0]
  for (const t of LEVEL_THRESHOLDS) {
    if (xp >= t.minXp) current = t
  }
  const idx = LEVEL_THRESHOLDS.indexOf(current)
  const next = LEVEL_THRESHOLDS[idx + 1] ?? null
  const progress = next
    ? Math.min(100, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100))
    : 100
  return {
    level: current.level,
    name: current.name,
    minXp: current.minXp,
    nextMinXp: next?.minXp ?? null,
    progress,
  }
}

// ── Badge definitions ─────────────────────────────────────────────────────────
export const BADGE_DEFS = [
  { id: 'first_practice',         name: 'First Practice',         icon: '🎯', desc: 'Complete your first test' },
  { id: 'week_streak',            name: 'Week Streak',            icon: '🔥', desc: '7-day practice streak' },
  { id: 'drill_master',           name: 'Drill Master',           icon: '⚡', desc: '10 daily drills done' },
  { id: 'module_scholar',         name: 'Module Scholar',         icon: '📚', desc: 'All 5 modules completed' },
  { id: 'rising_star',            name: 'Rising Star',            icon: '⭐', desc: 'Score ≥8.0 on any test' },
  { id: 'centurion',              name: 'Centurion',              icon: '💯', desc: '100 total questions answered' },
  { id: 'problem_framing_master', name: 'Problem Framing Master', icon: '🧠', desc: 'Avg Problem Framing ≥7' },
  { id: 'metrics_master',         name: 'Metrics Master',         icon: '📊', desc: 'Avg Metrics Reasoning ≥7' },
  { id: 'all_rounder',            name: 'All-Rounder',            icon: '🏆', desc: 'All 6 dimensions ≥7' },
  { id: 'interview_ready',        name: 'Interview Ready',        icon: '✅', desc: 'Readiness ≥80%' },
] as const

export type BadgeId = typeof BADGE_DEFS[number]['id']

const ALL_DIMENSIONS = [
  'problem_framing', 'user_empathy', 'structured_thinking',
  'prioritization', 'metrics_reasoning', 'communication_clarity',
]

// ── Badge evaluation ──────────────────────────────────────────────────────────
export interface BadgeCtx {
  streakCount: number
  completedTestCount: number     // full tests (attempt_number !== 0)
  drillCount: number             // drills (attempt_number === 0)
  modulesCompleted: string[]
  avgScores: Record<string, number | null>
  maxTestScore: number | null    // highest overall_score from full tests
  totalQuestions: number
  readinessPct: number           // 0–100
}

export function checkNewBadges(alreadyEarned: BadgeId[], ctx: BadgeCtx): BadgeId[] {
  const earned = new Set(alreadyEarned)
  const newBadges: BadgeId[] = []

  function check(id: BadgeId, condition: boolean) {
    if (!earned.has(id) && condition) newBadges.push(id)
  }

  check('first_practice',         ctx.completedTestCount >= 1)
  check('week_streak',            ctx.streakCount >= 7)
  check('drill_master',           ctx.drillCount >= 10)
  check('module_scholar',         ctx.modulesCompleted.length >= 5)
  check('rising_star',            ctx.maxTestScore !== null && ctx.maxTestScore >= 8.0)
  check('centurion',              ctx.totalQuestions >= 100)
  check('problem_framing_master', (ctx.avgScores['problem_framing'] ?? 0) >= 7)
  check('metrics_master',         (ctx.avgScores['metrics_reasoning'] ?? 0) >= 7)
  check('all_rounder',            ALL_DIMENSIONS.every((d) => (ctx.avgScores[d] ?? 0) >= 7))
  check('interview_ready',        ctx.readinessPct >= 80)

  return newBadges
}

// ── XP + badge award ──────────────────────────────────────────────────────────
export interface AwardResult {
  xp_total: number
  level: number
  level_name: string
  old_level: number
}

export async function awardXP(
  userId: string,
  amount: number,
  newBadgeIds: BadgeId[],
  client: SupabaseClient,
): Promise<AwardResult> {
  const { data: profile } = await client
    .from('profiles')
    .select('xp_total, level, badges_earned')
    .eq('id', userId)
    .maybeSingle()

  const currentXp    = (profile?.xp_total as number) ?? 0
  const currentLevel = (profile?.level as number) ?? 1
  const currentBadges = (profile?.badges_earned as { id: string; earned_at: string }[]) ?? []

  const newXp = currentXp + amount
  const newLevelInfo = computeLevel(newXp)

  const newBadgeObjects = newBadgeIds.map((id) => ({
    id,
    earned_at: new Date().toISOString(),
  }))

  await client
    .from('profiles')
    .update({
      xp_total: newXp,
      level: newLevelInfo.level,
      badges_earned: [...currentBadges, ...newBadgeObjects],
    })
    .eq('id', userId)

  return {
    xp_total: newXp,
    level: newLevelInfo.level,
    level_name: newLevelInfo.name,
    old_level: currentLevel,
  }
}
