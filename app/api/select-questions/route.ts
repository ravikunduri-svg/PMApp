import { NextRequest, NextResponse } from 'next/server'
import { selectQuestions } from '@/lib/selection-engine'
import { adminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { user_id, archetype } = await req.json()

    if (!user_id || !archetype) {
      return NextResponse.json({ error: 'user_id and archetype required' }, { status: 400 })
    }

    // Get user's past scores from completed sessions
    const { data: sessions } = await adminClient
      .from('practice_sessions')
      .select('scores, question_results')
      .eq('user_id', user_id)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(5)

    // Average scores across recent sessions
    const currentScores: Record<string, number> = {}
    const dimTotals: Record<string, { sum: number; count: number }> = {}

    for (const s of sessions ?? []) {
      for (const [dim, score] of Object.entries(s.scores ?? {})) {
        if (score === null) continue
        if (!dimTotals[dim]) dimTotals[dim] = { sum: 0, count: 0 }
        dimTotals[dim].sum += score as number
        dimTotals[dim].count++
      }
    }
    for (const [dim, { sum, count }] of Object.entries(dimTotals)) {
      currentScores[dim] = sum / count
    }

    // Get mastered question ids
    const allResults = (sessions ?? []).flatMap((s) => s.question_results ?? []) as {
      question_id: string
      overall_score: number
    }[]
    const masteredIds = allResults
      .filter((r) => r.overall_score >= 7)
      .map((r) => r.question_id)

    const selected = selectQuestions(archetype, currentScores, masteredIds)

    // Create a new session
    const { data: newSession, error } = await adminClient
      .from('practice_sessions')
      .insert({
        user_id,
        archetype,
        status: 'in_progress',
        questions: selected,
        answers: [],
        scores: {},
        question_results: [],
        attempt_number: (sessions?.length ?? 0) + 1,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ session_id: newSession.id, questions: selected })
  } catch (err) {
    console.error('select-questions error:', err)
    return NextResponse.json({ error: 'Failed to select questions' }, { status: 500 })
  }
}
