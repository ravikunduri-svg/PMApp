'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ResumeCritiqueResult } from '@/lib/groq'

const SIGNAL_CONFIG = {
  pm_ready: { label: 'PM-Ready', emoji: '✅', color: 'text-emerald-400', bg: 'bg-emerald-950/20 border-emerald-900/40' },
  needs_work: { label: 'Needs Work', emoji: '🟡', color: 'text-amber-400', bg: 'bg-amber-950/20 border-amber-900/40' },
  not_yet: { label: 'Not Yet PM-Ready', emoji: '❌', color: 'text-red-400', bg: 'bg-red-950/20 border-red-900/40' },
}

const DIM_META: Record<string, { label: string; description: string }> = {
  impact_framing: { label: 'Impact Framing', description: 'Outcomes vs. activities' },
  quantification: { label: 'Quantification', description: 'Numbers backing results' },
  pm_narrative: { label: 'PM Narrative', description: 'Coherent product story' },
  cross_functional: { label: 'Cross-Functional', description: 'Eng, design, data collaboration' },
  transition_readiness: { label: 'Transition Readiness', description: 'PM pivot clarity' },
}

function scoreColor(score: number) {
  if (score >= 7) return 'text-emerald-400'
  if (score >= 5) return 'text-amber-400'
  return 'text-red-400'
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100
  const color = score >= 7 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function ResumePage() {
  const [resumeText, setResumeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ResumeCritiqueResult | null>(null)

  async function analyzeResume() {
    if (resumeText.trim().length < 200) {
      setError('Paste at least 200 characters from your resume.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/critique-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: resumeText }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Analysis failed')
        return
      }
      setResult(data)
    } catch {
      setError('Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const config = result ? SIGNAL_CONFIG[result.overall_signal] : null

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
          <h1 className="text-2xl font-bold text-white">Resume Critique</h1>
          <p className="text-gray-400 text-sm mt-1">
            Paste your resume. We&apos;ll tell you if it&apos;s PM-ready — and exactly what to fix before sending it out.
          </p>
        </div>

        {!result ? (
          <div>
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">
                Your Resume <span className="text-gray-600">(paste the full text, min 200 chars)</span>
              </label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume text here — work experience, projects, education, skills..."
                rows={14}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm resize-none"
              />
              <p className="text-xs text-gray-600 mt-1 text-right">{resumeText.length} chars</p>
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-4 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={analyzeResume}
              disabled={loading || resumeText.trim().length < 200}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span> Analyzing resume…
                </span>
              ) : 'Analyze Resume →'}
            </button>

            <p className="text-xs text-gray-600 mt-3 text-center">
              Your resume is sent to an AI model for analysis and is not stored.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Verdict */}
            <div className={`border rounded-2xl p-6 flex items-center gap-5 ${config!.bg}`}>
              <span className="text-5xl">{config!.emoji}</span>
              <div>
                <div className="flex items-baseline gap-3">
                  <span className={`text-3xl font-bold ${config!.color}`}>{result.overall_score}/10</span>
                  <span className={`text-lg font-semibold ${config!.color}`}>{config!.label}</span>
                </div>
                <p className="text-gray-300 text-sm mt-2 leading-relaxed">{result.summary}</p>
              </div>
            </div>

            {/* Dimension Scores */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="font-semibold text-white mb-4">Dimension Scores</h2>
              <div className="space-y-5">
                {Object.entries(result.dimensions).map(([key, dim]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-sm text-gray-200">{DIM_META[key]?.label ?? key}</span>
                        <span className="text-xs text-gray-500 ml-2">{DIM_META[key]?.description}</span>
                      </div>
                      <span className={`text-sm font-mono font-semibold ${scoreColor(dim.score)}`}>
                        {dim.score}/10
                      </span>
                    </div>
                    <ScoreBar score={dim.score} />
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">{dim.feedback}</p>
                    {dim.example_from_resume && (
                      <div className="mt-2 bg-gray-800/60 rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500 mb-1">From your resume:</p>
                        <p className="text-xs text-gray-300 italic">&quot;{dim.example_from_resume}&quot;</p>
                        {dim.suggested_rewrite && (
                          <>
                            <p className="text-xs text-indigo-400 mt-2 mb-1">Suggested:</p>
                            <p className="text-xs text-indigo-200 italic">&quot;{dim.suggested_rewrite}&quot;</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Strength & Gap */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4">
                <p className="text-xs text-emerald-400 font-semibold mb-1">Top Strength</p>
                <p className="text-sm text-gray-200 leading-relaxed">{result.top_strength}</p>
              </div>
              <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4">
                <p className="text-xs text-red-400 font-semibold mb-1">Biggest Gap</p>
                <p className="text-sm text-gray-200 leading-relaxed">{result.biggest_gap}</p>
              </div>
            </div>

            {/* Rewrites */}
            {result.rewrites.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="font-semibold text-white mb-4">Suggested Rewrites</h2>
                <div className="space-y-5">
                  {result.rewrites.map((rw, i) => (
                    <div key={i} className="space-y-2">
                      <div className="bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2">
                        <p className="text-xs text-red-400 mb-1">Before</p>
                        <p className="text-sm text-gray-300 italic">&quot;{rw.original}&quot;</p>
                      </div>
                      <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg px-3 py-2">
                        <p className="text-xs text-emerald-400 mb-1">After</p>
                        <p className="text-sm text-gray-200 italic">&quot;{rw.improved}&quot;</p>
                      </div>
                      <p className="text-xs text-gray-500 px-1">{rw.why}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Actions */}
            {result.next_actions.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="font-semibold text-white mb-4">Before You Send This Resume</h2>
                <ol className="space-y-3">
                  {result.next_actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 bg-indigo-900/60 text-indigo-300 rounded-full text-xs flex items-center justify-center font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-gray-300 leading-relaxed">{action}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setResult(null)}
                className="flex-1 text-center bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                Analyze Another Version
              </button>
              <Link
                href="/practice"
                className="flex-1 text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                Practice Interview Skills →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
