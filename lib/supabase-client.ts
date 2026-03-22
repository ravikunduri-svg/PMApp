// Browser-safe Supabase client — uses @supabase/ssr to sync session into cookies
// so the server-side proxy can read the session correctly
import { createBrowserClient as ssrCreateBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createBrowserClient() {
  return ssrCreateBrowserClient(supabaseUrl, supabaseAnonKey)
}

export type Archetype = 'consumer' | 'b2b' | 'technical'

export type DimensionScores = {
  problem_framing: number | null
  user_empathy: number | null
  structured_thinking: number | null
  prioritization: number | null
  metrics_reasoning: number | null
  communication_clarity: number | null
}
