import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Browser / client-side client (uses anon key + RLS)
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Server-side client with cookie session (for API routes & server components)
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  })
}

// Service role client — server-side only, bypasses RLS
export const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export type Archetype = 'consumer' | 'b2b' | 'technical'

export type DimensionScores = {
  problem_framing: number | null
  user_empathy: number | null
  structured_thinking: number | null
  prioritization: number | null
  metrics_reasoning: number | null
  communication_clarity: number | null
}

export type QuestionResult = {
  question_id: string
  question_text: string
  answer: string
  answer_type: 'mcq' | 'text' | 'voice'
  scores: Partial<DimensionScores>
  feedback: Partial<Record<keyof DimensionScores, string>>
  overall_score: number
  top_strength: string
  biggest_gap: string
  improvement_tip: string
}

export type PracticeSession = {
  id: string
  user_id: string
  archetype: Archetype
  status: 'in_progress' | 'scoring' | 'complete' | 'error'
  questions: Question[]
  answers: Answer[]
  scores: Partial<DimensionScores>
  question_results: QuestionResult[]
  overall_score: number | null
  attempt_number: number
  created_at: string
  completed_at: string | null
}

export type Question = {
  id: string
  text: string
  type: 'mcq' | 'text' | 'voice'
  dimensions: (keyof DimensionScores)[]
  options?: string[]           // MCQ options
  correct_option?: number      // MCQ correct index
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  archetype?: Archetype | 'shared'
}

export type Answer = {
  question_id: string
  answer: string
  answer_type: 'mcq' | 'text' | 'voice'
}
