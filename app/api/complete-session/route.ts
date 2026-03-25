import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase-server'
import {
  XP_PER_ACTION,
  BADGE_DEFS,
  checkNewBadges,
  awardXP,
  computeLevel,
  type BadgeId,
} from '@/lib/gamification'

export async function POST(req: NextRequest) {
  try {
    const { session_id, user_id } = await req.json()
    if (!session_id || !user_id) {
      return NextResponse.json({ error: 'session_id and user_id required' }, { status: 400 })
    }

    // Mark session complete
    const { error: sessionError } = await adminClient
      .from('practice_sessions')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', session_id)
      .eq('user_id', user_id)

    if (sessionError) throw sessionError

    // Parallel fetch: completed session (attempt_number), profile, all completed sessions
    const todayStr     = new Date().toISOString().split('T')[0]
    const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]

    const [{ data: sessionData }, { data: profile }, { data: allCompleted }] = await Promise.all([
      adminClient
        .from('practice_sessions')
        .select('attempt_number')
        .eq('id', session_id)
        .single(),
      adminClient
        .from('profiles')
        .select('streak_count, streak_last_active, xp_total, level, badges_earned, modules_completed')
        .eq('id', user_id)
        .single(),
      adminClient
        .from('practice_sessions')
        .select('id, scores, overall_score, question_results, attempt_number')
        .eq('user_id', user_id)
        .eq('status', 'complete'),
    ])

    // ── Streak ─────────────────────────────────────────────────────────────────
    const lastActive = profile?.streak_last_active as string | null
    let newStreak: number

    if (lastActive === todayStr) {
      newStreak = profile?.streak_count ?? 1
    } else if (lastActive === yesterdayStr) {
      newStreak = (profile?.streak_count ?? 0) + 1
    } else {
      newStreak = 1
    }

    await adminClient
      .from('profiles')
      .update({ streak_count: newStreak, streak_last_active: todayStr })
      .eq('id', user_id)

    // ── XP amount ──────────────────────────────────────────────────────────────
    const isDrill = (sessionData?.attempt_number ?? 1) === 0
    let xpEarned  = isDrill ? XP_PER_ACTION.drill : XP_PER_ACTION.full_test

    // ── Stats for badge evaluation ─────────────────────────────────────────────
    const allSessions = allCompleted ?? []

    const completedTests  = allSessions.filter((s) => s.attempt_number !== 0)
    const drillSessions   = allSessions.filter((s) => s.attempt_number === 0)

    // Avg scores across all completed sessions
    const dimTotals: Record<string, { sum: number; count: number }> = {}
    for (const s of allSessions) {
      for (const [dim, score] of Object.entries(s.scores ?? {})) {
        if (score === null) continue
        if (!dimTotals[dim]) dimTotals[dim] = { sum: 0, count: 0 }
        dimTotals[dim].sum  += score as number
        dimTotals[dim].count++
      }
    }
    const avgScores: Record<string, number | null> = {}
    for (const dim of Object.keys(dimTotals)) {
      avgScores[dim] = Math.round((dimTotals[dim].sum / dimTotals[dim].count) * 10) / 10
    }

    // Avg scores EXCLUDING current session (for mastery bonus detection)
    const prevSessions = allSessions.filter((s) => s.id !== session_id)
    const prevDimTotals: Record<string, { sum: number; count: number }> = {}
    for (const s of prevSessions) {
      for (const [dim, score] of Object.entries(s.scores ?? {})) {
        if (score === null) continue
        if (!prevDimTotals[dim]) prevDimTotals[dim] = { sum: 0, count: 0 }
        prevDimTotals[dim].sum  += score as number
        prevDimTotals[dim].count++
      }
    }
    const prevAvgScores: Record<string, number | null> = {}
    for (const dim of Object.keys(prevDimTotals)) {
      prevAvgScores[dim] = Math.round((prevDimTotals[dim].sum / prevDimTotals[dim].count) * 10) / 10
    }

    // First-time dimension mastery bonus (+100 XP per newly mastered dimension)
    for (const [dim, curr] of Object.entries(avgScores)) {
      const prev = prevAvgScores[dim] ?? null
      if (curr !== null && curr >= 7 && (prev === null || prev < 7)) {
        xpEarned += XP_PER_ACTION.dimension_mastery
      }
    }

    const totalQuestions = allSessions.reduce((sum, s) => {
      return sum + (Array.isArray(s.question_results) ? s.question_results.length : 0)
    }, 0)

    const maxTestScore = completedTests.length > 0
      ? Math.max(...completedTests.map((s) => s.overall_score ?? 0))
      : null

    const avgOverall = completedTests.length > 0
      ? completedTests.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) / completedTests.length
      : 0

    const readinessPct = Math.min(100, Math.round((avgOverall / 10) * 100))

    const alreadyEarned = ((profile?.badges_earned as { id: string }[]) ?? []).map((b) => b.id as BadgeId)
    const modulesCompleted = (profile?.modules_completed as string[]) ?? []

    const badgeCtx = {
      streakCount:       newStreak,
      completedTestCount: completedTests.length,
      drillCount:        drillSessions.length,
      modulesCompleted,
      avgScores,
      maxTestScore,
      totalQuestions,
      readinessPct,
    }

    const newBadgeIds  = checkNewBadges(alreadyEarned, badgeCtx)
    const awardResult  = await awardXP(user_id, xpEarned, newBadgeIds, adminClient)

    // Map badge IDs → { id, name, icon } for celebration screen
    const badgeDefMap  = Object.fromEntries(BADGE_DEFS.map((b) => [b.id, b]))
    const newBadgeObjs = newBadgeIds.map((id) => ({
      id,
      name: badgeDefMap[id]?.name ?? id,
      icon: badgeDefMap[id]?.icon ?? '🏅',
    }))

    return NextResponse.json({
      ok:         true,
      streak:     newStreak,
      xp_earned:  xpEarned,
      new_badges: newBadgeObjs,
      xp_total:   awardResult.xp_total,
      level:      awardResult.level,
      level_name: awardResult.level_name,
      leveled_up: awardResult.level > awardResult.old_level,
      old_level:  awardResult.old_level,
    })
  } catch (err) {
    console.error('complete-session error:', err)
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 })
  }
}
