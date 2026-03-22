'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-client'
import Link from 'next/link'
import PMRadarChart from '@/components/RadarChart'

type GapItem = {
  dimension: string
  user_score: number
  required: number
  gap: number
}

type ReadinessResult = {
  parsed_role: string
  inferred_archetype: string
  role_requirements: Record<string, number>
  user_scores: Record<string, number>
  gap_analysis: GapItem[]
  readiness_pct: number
  recommendation: 'ready' | 'almost' | 'not_yet'
  confidence: string
  tests_used: number
}

const RECOMMENDATION_CONFIG = {
  ready: { label: 'Ready to Apply', emoji: '✅', color: 'text-emerald-400', bg: 'bg-emerald-950/20 border-emerald-900/40' },
  almost: { label: 'Almost Ready', emoji: '🟡', color: 'text-amber-400', bg: 'bg-amber-950/20 border-amber-900/40' },
  not_yet: { label: 'Not Yet Ready', emoji: '❌', color: 'text-red-400', bg: 'bg-red-950/20 border-red-900/40' },
}

const DIM_LABELS: Record<string, string> = {
  problem_framing: 'Problem Framing',
  user_empathy: 'User Empathy',
  structured_thinking: 'Structured Thinking',
  prioritization: 'Prioritization',
  metrics_reasoning: 'Metrics Reasoning',
  communication_clarity: 'Communication',
}

export default function ReadinessPage() {
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ReadinessResult | null>(null)
  const supabase = createBrowserClient()

  async function analyzeJD() {
    if (jdText.length < 100) {
      setError('Paste at least 100 characters from the job description.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth/login'; return }

      const res = await fetch('/api/parse-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, jd_text: jdText }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Analysis failed')
        return
      }

      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const config = result ? RECOMMENDATION_CONFIG[result.recommendation] : null

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

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">JD Readiness Check</h1>
          <p className="text-gray-400 text-sm mt-1">
            Paste a job description. We&apos;ll tell you if you&apos;re ready to apply — and which dimensions to close first.
          </p>
        </div>

        {!result ? (
          <div>
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">
                Job Description <span className="text-gray-600">(min 100 chars)</span>
              </label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the full job description here — title, responsibilities, requirements..."
                rows={12}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm resize-none"
              />
              <p className="text-xs text-gray-600 mt-1 text-right">{jdText.length} chars</p>
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-4 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
                {error}
                {error.includes('3 practice tests') && (
                  <Link href="/practice" className="ml-2 text-indigo-400 hover:underline">Start practicing →</Link>
                )}
              </p>
            )}

            <button
              onClick={analyzeJD}
              disabled={loading || jdText.length < 100}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span> Analyzing JD…
                </span>
              ) : 'Analyze Readiness →'}
            </button>
          </div>
        ) : (
          <div>
            {/* Verdict */}
            <div className={`border rounded-2xl p-6 mb-6 flex items-center gap-5 ${config!.bg}`}>
              <span className="text-5xl">{config!.emoji}</span>
              <div>
                <div className="flex items-baseline gap-3">
                  <span className={`text-4xl font-bold ${config!.color}`}>{result.readiness_pct}%</span>
                  <span className={`text-lg font-semibold ${config!.color}`}>{config!.label}</span>
                </div>
                <p className="text-gray-400 text-sm mt-1">
                  Role: <strong className="text-white">{result.parsed_role}</strong>
                  {' · '}{result.inferred_archetype.toUpperCase()} PM track
                  {' · '}Based on {result.tests_used} test{result.tests_used > 1 ? 's' : ''} ({result.confidence} confidence)
                </p>
              </div>
            </div>

            {/* Radar: user vs required */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-white mb-2">You vs. Role Requirements</h2>
              <p className="text-xs text-gray-500 mb-4">
                <span className="text-indigo-400">■</span> Your scores &nbsp;
                <span className="text-amber-400">■</span> Role requirements
              </p>
              <PMRadarChart scores={result.user_scores} comparison={result.role_requirements} />
            </div>

            {/* Gap Analysis */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-white mb-4">Gap Analysis</h2>
              <div className="space-y-3">
                {result.gap_analysis
                  .sort((a, b) => b.gap - a.gap)
                  .map((item) => (
                    <div key={item.dimension} className="flex items-center gap-4">
                      <span className="text-sm text-gray-300 w-36 flex-shrink-0">
                        {DIM_LABELS[item.dimension] ?? item.dimension}
                      </span>
                      <div className="flex-1">
                        <div className="flex gap-1 h-2">
                          <div
                            className="bg-indigo-500 rounded-l-full"
                            style={{ width: `${(item.user_score / 10) * 100}%` }}
                          />
                          {item.gap > 0 && (
                            <div
                              className="bg-red-800/60 rounded-r-full"
                              style={{ width: `${(item.gap / 10) * 100}%` }}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs flex-shrink-0">
                        <span className="text-indigo-400 font-mono">{item.user_score}</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-amber-400 font-mono">{item.required}</span>
                        {item.gap > 0 && (
                          <span className="text-red-400 font-mono">-{item.gap.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setResult(null)}
                className="flex-1 text-center bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                Try Another JD
              </button>
              <Link
                href="/practice"
                className="flex-1 text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                Practice to Close Gaps →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
