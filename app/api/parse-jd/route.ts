import { NextRequest, NextResponse } from 'next/server'
import { parseJobDescription, computeReadiness } from '@/lib/groq'
import { adminClient } from '@/lib/supabase-server'
import type { Dimension } from '@/lib/questions'

export async function POST(req: NextRequest) {
  try {
    const { user_id, jd_text } = await req.json()

    if (!user_id || !jd_text) {
      return NextResponse.json({ error: 'user_id and jd_text required' }, { status: 400 })
    }

    if (jd_text.length < 100) {
      return NextResponse.json({ error: 'JD must be at least 100 characters' }, { status: 400 })
    }

    // Check minimum 3 completed tests
    const { count } = await adminClient
      .from('practice_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('status', 'complete')

    if ((count ?? 0) < 3) {
      return NextResponse.json(
        { error: 'Complete at least 3 practice tests before using JD Readiness Check', tests_completed: count },
        { status: 403 }
      )
    }

    // Get user's recent scores (last 5 sessions)
    const { data: sessions } = await adminClient
      .from('practice_sessions')
      .select('scores')
      .eq('user_id', user_id)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(5)

    const dimTotals: Record<string, { sum: number; count: number }> = {}
    for (const s of sessions ?? []) {
      for (const [dim, score] of Object.entries(s.scores ?? {})) {
        if (score === null) continue
        if (!dimTotals[dim]) dimTotals[dim] = { sum: 0, count: 0 }
        dimTotals[dim].sum += score as number
        dimTotals[dim].count++
      }
    }
    const userScores: Partial<Record<Dimension, number>> = {}
    for (const [dim, { sum, count }] of Object.entries(dimTotals)) {
      userScores[dim as Dimension] = Math.round((sum / count) * 10) / 10
    }

    // Parse JD
    const jdResult = await parseJobDescription(jd_text)

    // Compute readiness
    const readiness = computeReadiness(userScores, jdResult.role_requirements)

    const sessionCount = count ?? 0
    const confidence =
      sessionCount > 10 ? 'very_high' : sessionCount > 5 ? 'high' : sessionCount >= 3 ? 'moderate' : 'low'

    // Save to DB
    const { data: saved } = await adminClient
      .from('readiness_checks')
      .insert({
        user_id,
        jd_text,
        parsed_role: jdResult.parsed_role,
        role_requirements: jdResult.role_requirements,
        user_scores: userScores,
        gap_analysis: readiness.gap_analysis,
        recommendation: readiness.recommendation,
        readiness_pct: readiness.readiness_pct,
      })
      .select()
      .single()

    return NextResponse.json({
      check_id: saved?.id,
      parsed_role: jdResult.parsed_role,
      inferred_archetype: jdResult.inferred_archetype,
      role_requirements: jdResult.role_requirements,
      user_scores: userScores,
      gap_analysis: readiness.gap_analysis,
      readiness_pct: readiness.readiness_pct,
      recommendation: readiness.recommendation,
      confidence,
      tests_used: sessionCount,
    })
  } catch (err) {
    console.error('parse-jd error:', err)
    return NextResponse.json({ error: 'JD analysis failed' }, { status: 500 })
  }
}
