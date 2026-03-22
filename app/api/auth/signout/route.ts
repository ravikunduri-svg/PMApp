import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  const origin = new URL(req.url).origin
  return NextResponse.redirect(`${origin}/auth/login`)
}
