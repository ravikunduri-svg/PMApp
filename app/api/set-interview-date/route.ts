import { NextRequest, NextResponse } from 'next/server'
import { adminClient, createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { interview_date } = await req.json()
    if (!interview_date || !/^\d{4}-\d{2}-\d{2}$/.test(interview_date)) {
      return NextResponse.json({ error: 'interview_date must be YYYY-MM-DD' }, { status: 400 })
    }

    const { error } = await adminClient
      .from('profiles')
      .update({ interview_date })
      .eq('id', user.id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('set-interview-date error:', err)
    return NextResponse.json({ error: 'Failed to save date' }, { status: 500 })
  }
}
