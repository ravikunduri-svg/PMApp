import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { user_id, archetype, question } = await req.json()
    if (!user_id || !archetype || !question) {
      return NextResponse.json({ error: 'user_id, archetype, and question required' }, { status: 400 })
    }

    const { data: newSession, error } = await adminClient
      .from('practice_sessions')
      .insert({
        user_id,
        archetype,
        status: 'in_progress',
        questions: [question],
        answers: [],
        scores: {},
        question_results: [],
        attempt_number: 0, // 0 = drill session sentinel
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ session_id: newSession.id })
  } catch (err) {
    console.error('drill/start error:', err)
    return NextResponse.json({ error: 'Failed to start drill' }, { status: 500 })
  }
}
