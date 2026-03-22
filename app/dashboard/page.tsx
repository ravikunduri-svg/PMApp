import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, adminClient } from '@/lib/supabase-server'

const DIM_LABELS: Record<string, string> = {
  problem_framing: 'Problem Framing',
  user_empathy: 'User Empathy',
  structured_thinking: 'Structured Thinking',
  prioritization: 'Prioritization',
  metrics_reasoning: 'Metrics Reasoning',
  communication_clarity: 'Communication',
}

function scoreColor(score: number | null) {
  if (score === null) return 'text-gray-500'
  if (score >= 7) return 'text-emerald-400'
  if (score >= 5) return 'text-amber-400'
  return 'text-red-400'
}

function ScoreBar({ score }: { score: number | null }) {
  const pct = score ? (score / 10) * 100 : 0
  const color = score === null ? 'bg-gray-700' : score >= 7 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await adminClient
    .from('profiles')
    .select('archetype, email')
    .eq('id', user.id)
    .single()

  if (!profile?.archetype) redirect('/onboarding')

  const { data: sessions } = await adminClient
    .from('practice_sessions')
    .select('id, status, scores, overall_score, created_at, attempt_number')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const completedSessions = sessions?.filter((s) => s.status === 'complete') ?? []
  const latestScores = completedSessions[0]?.scores ?? {}

  // Avg scores across all sessions
  const dimTotals: Record<string, { sum: number; count: number }> = {}
  for (const s of completedSessions) {
    for (const [dim, score] of Object.entries(s.scores ?? {})) {
      if (score === null) continue
      if (!dimTotals[dim]) dimTotals[dim] = { sum: 0, count: 0 }
      dimTotals[dim].sum += score as number
      dimTotals[dim].count++
    }
  }
  const avgScores: Record<string, number | null> = {}
  for (const dim of Object.keys(DIM_LABELS)) {
    avgScores[dim] = dimTotals[dim]
      ? Math.round((dimTotals[dim].sum / dimTotals[dim].count) * 10) / 10
      : null
  }

  const archetypeLabel =
    profile.archetype === 'b2b' ? 'B2B PM' :
    profile.archetype === 'consumer' ? 'Consumer PM' : 'Technical PM'

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
            <span>🧭</span> PMPathfinder
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/modules" className="text-sm text-gray-400 hover:text-white transition-colors">Modules</Link>
            <Link href="/practice" className="text-sm text-gray-400 hover:text-white transition-colors">Practice</Link>
            <Link href="/readiness" className="text-sm text-gray-400 hover:text-white transition-colors">JD Check</Link>
            <form action="/api/auth/signout" method="POST">
              <button className="text-sm text-gray-500 hover:text-white transition-colors">Sign out</button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <span className="text-xs bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 px-2 py-0.5 rounded-full">
              {archetypeLabel}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            {completedSessions.length === 0
              ? 'Complete your first practice test to see your scores.'
              : `${completedSessions.length} test${completedSessions.length > 1 ? 's' : ''} completed`}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Link href="/practice" className="bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-2xl p-5 flex items-center gap-4">
            <span className="text-3xl">🎯</span>
            <div>
              <p className="font-semibold text-white">Start Practice</p>
              <p className="text-indigo-200 text-xs">5 adaptive questions</p>
            </div>
          </Link>
          <Link href="/modules" className="bg-gray-900 hover:bg-gray-800 border border-gray-800 transition-colors rounded-2xl p-5 flex items-center gap-4">
            <span className="text-3xl">📚</span>
            <div>
              <p className="font-semibold text-white">Learn</p>
              <p className="text-gray-400 text-xs">5 foundation modules</p>
            </div>
          </Link>
          <Link href="/readiness" className={`${completedSessions.length >= 3 ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-900 opacity-50 cursor-not-allowed pointer-events-none'} border border-gray-800 transition-colors rounded-2xl p-5 flex items-center gap-4`}>
            <span className="text-3xl">📋</span>
            <div>
              <p className="font-semibold text-white">JD Readiness</p>
              <p className="text-gray-400 text-xs">
                {completedSessions.length >= 3
                  ? 'Paste a job description'
                  : `Unlock after ${3 - completedSessions.length} more test${3 - completedSessions.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dimension Scores */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-4">Your Dimension Scores</h2>
            {completedSessions.length === 0 ? (
              <p className="text-gray-500 text-sm">Complete a practice test to see scores.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(DIM_LABELS).map(([key, label]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300">{label}</span>
                      <span className={`text-sm font-mono font-medium ${scoreColor(avgScores[key])}`}>
                        {avgScores[key] !== null ? `${avgScores[key]}/10` : '—'}
                      </span>
                    </div>
                    <ScoreBar score={avgScores[key]} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Sessions */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-4">Recent Tests</h2>
            {!sessions || sessions.length === 0 ? (
              <p className="text-gray-500 text-sm">No tests yet.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-300">
                        Test #{s.attempt_number}
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                          s.status === 'complete' ? 'bg-emerald-950/50 text-emerald-400'
                          : s.status === 'in_progress' ? 'bg-amber-950/50 text-amber-400'
                          : 'bg-gray-800 text-gray-500'
                        }`}>
                          {s.status}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.overall_score && (
                        <span className={`text-sm font-mono font-semibold ${scoreColor(s.overall_score)}`}>
                          {s.overall_score}/10
                        </span>
                      )}
                      {s.status === 'complete' && (
                        <Link
                          href={`/report/${s.id}`}
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
