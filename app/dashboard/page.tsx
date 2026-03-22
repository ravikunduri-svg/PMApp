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

  // Fetch recent 5 for display, and all completed for accurate stats
  const [{ data: sessions }, { data: allCompleted }] = await Promise.all([
    adminClient
      .from('practice_sessions')
      .select('id, status, scores, overall_score, created_at, attempt_number')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    adminClient
      .from('practice_sessions')
      .select('scores, overall_score, created_at')
      .eq('user_id', user.id)
      .eq('status', 'complete')
      .order('created_at', { ascending: true }),
  ])

  const completedSessions = sessions?.filter((s) => s.status === 'complete') ?? []
  const allCompletedSessions = allCompleted ?? []

  // Avg scores across ALL completed sessions
  const dimTotals: Record<string, { sum: number; count: number }> = {}
  for (const s of allCompletedSessions) {
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

  // ── Derived stats ──────────────────────────────────────────────
  const totalCompleted = allCompletedSessions.length

  const avgOverall = totalCompleted > 0
    ? Math.round(
        allCompletedSessions.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) / totalCompleted * 10
      ) / 10
    : null

  const masteredCount = Object.values(avgScores).filter((v) => v !== null && v >= 7).length

  // Weakest scored dimension (lowest non-null avg)
  let weakestDim: string | null = null
  let weakestScore = Infinity
  for (const [dim, score] of Object.entries(avgScores)) {
    if (score !== null && score < weakestScore) {
      weakestScore = score
      weakestDim = dim
    }
  }
  const weakestGap = weakestDim ? Math.round((7 - weakestScore) * 10) / 10 : null

  // Score delta: latest vs previous completed session
  const last2 = allCompletedSessions.slice(-2)
  const scoreDelta = last2.length === 2 && last2[0].overall_score != null && last2[1].overall_score != null
    ? Math.round((last2[1].overall_score - last2[0].overall_score) * 10) / 10
    : null

  // Per-session delta for the recent tests list (descending order, so index 0 = latest)
  const recentCompleted = (sessions ?? []).filter((s) => s.status === 'complete')
  const sessionDeltas: Record<string, number | null> = {}
  for (let i = 0; i < recentCompleted.length; i++) {
    const curr = recentCompleted[i]
    const prev = recentCompleted[i + 1]
    sessionDeltas[curr.id] =
      curr.overall_score != null && prev?.overall_score != null
        ? Math.round((curr.overall_score - prev.overall_score) * 10) / 10
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
            {totalCompleted === 0
              ? 'Complete your first practice test to see your scores.'
              : `${totalCompleted} test${totalCompleted > 1 ? 's' : ''} completed`}
          </p>
        </div>

        {/* Stats row */}
        {totalCompleted > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Tests completed</p>
              <p className="text-2xl font-bold text-white">{totalCompleted}</p>
              <p className="text-xs text-gray-500 mt-1">
                {totalCompleted < 3 ? `${3 - totalCompleted} more to unlock JD check` : 'JD check unlocked ✓'}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Avg overall score</p>
              <p className={`text-2xl font-bold ${scoreColor(avgOverall)}`}>
                {avgOverall ?? '—'}<span className="text-sm font-normal text-gray-500">/10</span>
              </p>
              {scoreDelta !== null && (
                <p className={`text-xs mt-1 ${scoreDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {scoreDelta >= 0 ? '▲' : '▼'} {Math.abs(scoreDelta)} vs prev test
                </p>
              )}
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Focus area</p>
              {weakestDim ? (
                <>
                  <p className="text-sm font-semibold text-amber-400 leading-tight">{DIM_LABELS[weakestDim]}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {weakestScore.toFixed(1)}/10
                    {weakestGap !== null && weakestGap > 0 && ` · ${weakestGap} to mastery`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500">—</p>
              )}
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Dimensions mastered</p>
              <p className="text-2xl font-bold text-emerald-400">
                {masteredCount}<span className="text-sm font-normal text-gray-500">/6</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">score ≥ 7</p>
            </div>
          </div>
        )}

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
          <Link href="/readiness" className={`${totalCompleted >= 3 ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-900 opacity-50 cursor-not-allowed pointer-events-none'} border border-gray-800 transition-colors rounded-2xl p-5 flex items-center gap-4`}>
            <span className="text-3xl">📋</span>
            <div>
              <p className="font-semibold text-white">JD Readiness</p>
              <p className="text-gray-400 text-xs">
                {totalCompleted >= 3
                  ? 'Paste a job description'
                  : `Unlock after ${3 - totalCompleted} more test${3 - totalCompleted > 1 ? 's' : ''}`}
              </p>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dimension Scores */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-4">Your Dimension Scores</h2>
            {totalCompleted === 0 ? (
              <p className="text-gray-500 text-sm">Complete a practice test to see scores.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(DIM_LABELS).map(([key, label]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300 flex items-center gap-1.5">
                        {label}
                        {avgScores[key] !== null && avgScores[key]! >= 7 && (
                          <span className="text-xs text-emerald-500">✓</span>
                        )}
                      </span>
                      <span className={`text-sm font-mono font-medium ${scoreColor(avgScores[key])}`}>
                        {avgScores[key] !== null ? `${avgScores[key]}/10` : '—'}
                      </span>
                    </div>
                    <ScoreBar score={avgScores[key]} />
                  </div>
                ))}
              </div>
            )}

            {/* Focus area callout */}
            {weakestDim && weakestGap !== null && weakestGap > 0 && (
              <div className="mt-5 bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-amber-400 font-semibold">Next focus</p>
                  <p className="text-sm text-white mt-0.5">{DIM_LABELS[weakestDim]}</p>
                  <p className="text-xs text-gray-500">{weakestGap} points to mastery</p>
                </div>
                <Link href="/practice" className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                  Practice →
                </Link>
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
                {sessions.map((s) => {
                  const delta = sessionDeltas[s.id] ?? null
                  return (
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
                        {delta !== null && (
                          <span className={`text-xs font-medium ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {delta >= 0 ? '▲' : '▼'}{Math.abs(delta)}
                          </span>
                        )}
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
                  )
                })}
              </div>
            )}

            {/* JD unlock progress */}
            {totalCompleted < 3 && (
              <div className="mt-5 pt-4 border-t border-gray-800">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>JD Readiness unlock</span>
                  <span>{totalCompleted}/3 tests</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${(totalCompleted / 3) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
