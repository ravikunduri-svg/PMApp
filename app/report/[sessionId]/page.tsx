import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, adminClient } from '@/lib/supabase-server'
import PMRadarChart from '@/components/RadarChart'

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
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default async function ReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: session } = await adminClient
    .from('practice_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) notFound()

  if (session.status === 'in_progress') {
    redirect(`/practice/${sessionId}`)
  }

  const scores: Record<string, number | null> = session.scores ?? {}
  const results = session.question_results ?? []

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
            <span>🧭</span> PMPathfinder
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">← Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Report Card</h1>
            <p className="text-gray-400 text-sm mt-1">
              Test #{session.attempt_number} ·{' '}
              {new Date(session.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })} ·{' '}
              <span className="capitalize">{session.archetype} PM</span>
            </p>
          </div>
          {session.overall_score !== null && (
            <div className="text-center bg-gray-900 border border-gray-800 rounded-2xl px-6 py-4">
              <div className={`text-4xl font-bold ${scoreColor(session.overall_score)}`}>
                {session.overall_score}
              </div>
              <div className="text-xs text-gray-400 mt-1">Overall / 10</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Radar Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-4">Dimension Radar</h2>
            <PMRadarChart scores={scores} />
          </div>

          {/* Score breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-4">Score Breakdown</h2>
            <div className="space-y-4">
              {Object.entries(DIM_LABELS).map(([key, label]) => (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-300">{label}</span>
                    <span className={`text-sm font-mono font-medium ${scoreColor(scores[key] ?? null)}`}>
                      {scores[key] != null ? `${scores[key]}/10` : '—'}
                    </span>
                  </div>
                  <ScoreBar score={scores[key] ?? null} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Per-question breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-white mb-5">Per-Question Feedback</h2>
          <div className="space-y-6">
            {results.map((r: Record<string, unknown>, i: number) => (
              <div key={i} className="border-b border-gray-800 pb-6 last:border-0 last:pb-0">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm text-gray-300 flex-1 pr-4">
                    <span className="text-gray-500 mr-2">Q{i + 1}.</span>
                    {r.question_text as string}
                  </p>
                  <span className={`text-lg font-bold font-mono flex-shrink-0 ${scoreColor(r.overall_score as number)}`}>
                    {String(r.overall_score)}/10
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                  {r.top_strength != null && (
                    <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-3">
                      <p className="text-xs text-emerald-400 font-medium mb-1">Strength</p>
                      <p className="text-xs text-gray-300">{String(r.top_strength)}</p>
                    </div>
                  )}
                  {r.biggest_gap != null && (
                    <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-3">
                      <p className="text-xs text-red-400 font-medium mb-1">Gap</p>
                      <p className="text-xs text-gray-300">{String(r.biggest_gap)}</p>
                    </div>
                  )}
                  {r.improvement_tip != null && (
                    <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-3">
                      <p className="text-xs text-amber-400 font-medium mb-1">Tip</p>
                      <p className="text-xs text-gray-300">{String(r.improvement_tip)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/practice"
            className="flex-1 text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Practice Again
          </Link>
          <Link
            href="/readiness"
            className="flex-1 text-center bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Check JD Readiness →
          </Link>
        </div>
      </main>
    </div>
  )
}
