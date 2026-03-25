'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────
export type ModuleSection    = { heading: string; body: string }
export type WorkedExample    = { title: string; scenario: string; weak_approach: string; strong_approach: string; key_insight: string }
export type KeyTakeaway      = { text: string; related_dimensions?: string[] }
export type ModuleResource   = { title: string; url: string; type: string; description: string }

export type ModuleData = {
  id: string
  title: string
  description?: string
  sections: ModuleSection[]
  learningObjectives?: string[]
  workedExamples?: WorkedExample[]
  keyTakeaways?: KeyTakeaway[]
  resources?: ModuleResource[]
  estimatedMinutes?: number | null
  prevId?: string | null
  nextId?: string | null
  prevTitle?: string | null
  nextTitle?: string | null
  initialCompleted: boolean
}

// ── Dimension pill colors ──────────────────────────────────────────────────────
const DIM_COLORS: Record<string, string> = {
  problem_framing:      'bg-violet-950/50 text-violet-300 border-violet-800/50',
  user_empathy:         'bg-pink-950/50 text-pink-300 border-pink-800/50',
  structured_thinking:  'bg-sky-950/50 text-sky-300 border-sky-800/50',
  prioritization:       'bg-amber-950/50 text-amber-300 border-amber-800/50',
  metrics_reasoning:    'bg-emerald-950/50 text-emerald-300 border-emerald-800/50',
  communication_clarity:'bg-indigo-950/50 text-indigo-300 border-indigo-800/50',
}
const DIM_LABELS: Record<string, string> = {
  problem_framing: 'Problem Framing', user_empathy: 'User Empathy',
  structured_thinking: 'Structured Thinking', prioritization: 'Prioritization',
  metrics_reasoning: 'Metrics', communication_clarity: 'Communication',
}

const RESOURCE_ICONS: Record<string, string> = {
  article: '📄', slides: '📊', video: '🎬', book: '📖', tool: '🛠️',
}

// ── Simple inline markdown renderer ──────────────────────────────────────────
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} className="text-white font-semibold">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  )
}

function BodyText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/)
  return (
    <div className="space-y-3">
      {paragraphs.map((para, i) => {
        const lines = para.split('\n').filter(Boolean)
        const isList = lines.length > 0 && lines.every(l => /^[-*]\s/.test(l.trim()))
        if (isList) {
          return (
            <ul key={i} className="space-y-2">
              {lines.map((line, j) => (
                <li key={j} className="flex gap-2.5 text-gray-300 text-sm leading-relaxed">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
                  <span><Inline text={line.replace(/^[-*]\s/, '')} /></span>
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className="text-gray-300 text-sm leading-relaxed">
            <Inline text={para} />
          </p>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ModuleReader({ data }: { data: ModuleData }) {
  const [readSections, setReadSections]         = useState<Set<number>>(new Set())
  const [exampleTabs, setExampleTabs]           = useState<Record<number, 'weak' | 'strong'>>({})
  const [revealedTakeaways, setRevealedTakeaways] = useState<Set<number>>(new Set())
  const [isCompleted, setIsCompleted]           = useState(data.initialCompleted)
  const [completing, setCompleting]             = useState(false)
  const [completionBanner, setCompletionBanner] = useState(false)
  const [xpToast, setXpToast]                   = useState(false)

  const totalSections = data.sections.length
  const readCount     = readSections.size
  const progressPct   = totalSections > 0 ? Math.round((readCount / totalSections) * 100) : 0
  const allRead       = readCount === totalSections && totalSections > 0

  function markSectionRead(idx: number) {
    setReadSections(prev => {
      const next = new Set(prev)
      next.add(idx)
      return next
    })
  }

  function toggleExampleTab(idx: number, tab: 'weak' | 'strong') {
    setExampleTabs(prev => ({ ...prev, [idx]: tab }))
  }

  function revealTakeaway(idx: number) {
    setRevealedTakeaways(prev => {
      const next = new Set(prev)
      next.add(idx)
      return next
    })
  }

  async function handleComplete() {
    if (isCompleted || completing) return
    setCompleting(true)
    try {
      const res  = await fetch('/api/complete-module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: data.id }),
      })
      const json = await res.json()
      if (res.ok && !json.already_complete) {
        setIsCompleted(true)
        setCompletionBanner(true)
        setXpToast(true)
        setTimeout(() => setXpToast(false), 2500)
      } else if (json.already_complete) {
        setIsCompleted(true)
      }
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
            <span>🧭</span> PMPathfinder
          </Link>
          <div className="flex items-center gap-4">
            {/* Progress pill */}
            {totalSections > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-24 bg-gray-800 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: progressPct === 100 ? '#10b981' : '#6366f1',
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500">{readCount}/{totalSections}</span>
              </div>
            )}
            <Link href="/modules" className="text-sm text-gray-400 hover:text-white transition-colors">← All Modules</Link>
          </div>
        </div>
        {/* Full-width progress bar */}
        <div className="h-0.5 bg-gray-900">
          <div
            className="h-0.5 transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              backgroundColor: progressPct === 100 ? '#10b981' : '#6366f1',
            }}
          />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* ── Completion banner ── */}
        {completionBanner && (
          <div className="mb-6 bg-emerald-950/40 border border-emerald-700/60 rounded-2xl px-5 py-4 flex items-center gap-4">
            <span className="text-3xl">🎉</span>
            <div className="flex-1">
              <p className="text-emerald-300 font-semibold">Module complete!</p>
              <p className="text-emerald-500/80 text-sm">+20 XP earned · Keep going to the next module</p>
            </div>
            {data.nextId && (
              <Link
                href={`/modules/${data.nextId}`}
                className="text-sm bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg whitespace-nowrap transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        )}

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {isCompleted && (
              <span className="text-xs bg-emerald-950/50 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                ✓ Completed
              </span>
            )}
            {data.estimatedMinutes && (
              <span className="text-xs text-gray-500">⏱ {data.estimatedMinutes} min read</span>
            )}
            <span className="text-xs text-gray-500">📖 {totalSections} sections</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{data.title}</h1>
          {data.description && (
            <p className="text-gray-400 text-sm leading-relaxed">{data.description}</p>
          )}
        </div>

        {/* ── Learning objectives ── */}
        {data.learningObjectives && data.learningObjectives.length > 0 && (
          <div className="bg-indigo-950/20 border border-indigo-800/40 rounded-2xl p-5 mb-8">
            <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-3">What you'll learn</p>
            <ul className="space-y-2">
              {data.learningObjectives.map((obj, i) => {
                // Auto-check objectives proportionally as sections are read
                const threshold = Math.floor((i / data.learningObjectives!.length) * totalSections)
                const checked   = readCount > threshold
                return (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 flex-shrink-0 text-sm transition-all ${checked ? 'text-emerald-400' : 'text-gray-600'}`}>
                      {checked ? '✓' : '○'}
                    </span>
                    <span className={`text-sm transition-colors ${checked ? 'text-gray-200' : 'text-gray-500'}`}>
                      {obj}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* ── Sections ── */}
        <div className="space-y-4 mb-10">
          {data.sections.map((section, idx) => {
            const read = readSections.has(idx)
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  read
                    ? 'border-emerald-800/40 bg-gray-900'
                    : 'border-gray-800 bg-gray-900'
                }`}
              >
                {/* Section header */}
                <div className={`flex items-center gap-3 px-6 pt-5 pb-0 ${read ? 'border-l-2 border-emerald-500' : 'border-l-2 border-transparent'}`}
                  style={{ marginLeft: '-1px' }}>
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${
                    read
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-gray-800 border-gray-700 text-gray-500'
                  }`}>
                    {read ? '✓' : idx + 1}
                  </span>
                  {section.heading && (
                    <h2 className={`font-semibold text-base transition-colors ${read ? 'text-white' : 'text-white'}`}>
                      {section.heading}
                    </h2>
                  )}
                </div>

                {/* Section body */}
                <div className="px-6 py-4">
                  <BodyText text={section.body} />
                </div>

                {/* Got it button */}
                <div className="px-6 pb-5 flex justify-end">
                  {read ? (
                    <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                      ✓ Got it
                    </span>
                  ) : (
                    <button
                      onClick={() => markSectionRead(idx)}
                      className="text-xs bg-gray-800 hover:bg-indigo-600 border border-gray-700 hover:border-indigo-500 text-gray-400 hover:text-white px-4 py-1.5 rounded-lg transition-all font-medium"
                    >
                      Got it ✓
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Worked examples ── */}
        {data.workedExamples && data.workedExamples.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-white">Worked Examples</h2>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                {data.workedExamples.length} examples
              </span>
            </div>

            <div className="space-y-5">
              {data.workedExamples.map((ex, idx) => {
                const activeTab = exampleTabs[idx] ?? 'strong'
                return (
                  <div key={idx} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    {/* Example title */}
                    <div className="px-6 pt-5 pb-3">
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Example {idx + 1}</p>
                      <h3 className="text-white font-semibold">{ex.title}</h3>
                    </div>

                    {/* Scenario */}
                    <div className="mx-6 mb-4 bg-gray-800/60 rounded-xl p-4">
                      <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest mb-1.5">Scenario</p>
                      <p className="text-gray-300 text-sm leading-relaxed">{ex.scenario}</p>
                    </div>

                    {/* Tabs */}
                    <div className="px-6 mb-0">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleExampleTab(idx, 'weak')}
                          className={`text-xs font-semibold px-4 py-2 rounded-t-lg border-b-2 transition-all ${
                            activeTab === 'weak'
                              ? 'text-red-300 border-red-500 bg-red-950/20'
                              : 'text-gray-500 border-transparent hover:text-gray-300'
                          }`}
                        >
                          ❌ Weak Approach
                        </button>
                        <button
                          onClick={() => toggleExampleTab(idx, 'strong')}
                          className={`text-xs font-semibold px-4 py-2 rounded-t-lg border-b-2 transition-all ${
                            activeTab === 'strong'
                              ? 'text-emerald-300 border-emerald-500 bg-emerald-950/20'
                              : 'text-gray-500 border-transparent hover:text-gray-300'
                          }`}
                        >
                          ✅ Strong Approach
                        </button>
                      </div>
                    </div>

                    {/* Tab content */}
                    <div className={`mx-6 mb-4 rounded-b-xl rounded-tr-xl p-4 ${
                      activeTab === 'weak'
                        ? 'bg-red-950/20 border border-red-900/40'
                        : 'bg-emerald-950/20 border border-emerald-900/40'
                    }`}>
                      <BodyText text={activeTab === 'weak' ? ex.weak_approach : ex.strong_approach} />
                    </div>

                    {/* Key insight */}
                    <div className="mx-6 mb-5 bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 flex gap-3">
                      <span className="text-lg flex-shrink-0">💡</span>
                      <div>
                        <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest mb-1">Key Insight</p>
                        <p className="text-gray-300 text-sm leading-relaxed">{ex.key_insight}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Key takeaways ── */}
        {data.keyTakeaways && data.keyTakeaways.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-white">Key Takeaways</h2>
              <span className="text-xs text-gray-500">
                {revealedTakeaways.size}/{data.keyTakeaways.length} revealed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {data.keyTakeaways.map((t, idx) => {
                const revealed = revealedTakeaways.has(idx)
                const colors   = [
                  'border-indigo-800/50 bg-indigo-950/20',
                  'border-violet-800/50 bg-violet-950/20',
                  'border-sky-800/50 bg-sky-950/20',
                ]
                const dotColors = ['bg-indigo-500', 'bg-violet-500', 'bg-sky-500']
                return (
                  <button
                    key={idx}
                    onClick={() => revealTakeaway(idx)}
                    className={`text-left rounded-2xl border p-5 transition-all ${colors[idx % colors.length]} ${
                      revealed ? '' : 'cursor-pointer hover:brightness-125'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${dotColors[idx % dotColors.length]}`} />
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-widest">
                        Takeaway {idx + 1}
                      </span>
                      {!revealed && (
                        <span className="ml-auto text-xs text-gray-600">tap to reveal</span>
                      )}
                    </div>

                    {revealed ? (
                      <>
                        <p className="text-gray-200 text-sm leading-relaxed">{t.text}</p>
                        {t.related_dimensions && t.related_dimensions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {t.related_dimensions.map((d) => (
                              <span
                                key={d}
                                className={`text-xs px-2 py-0.5 rounded-full border ${DIM_COLORS[d] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}
                              >
                                {DIM_LABELS[d] ?? d}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-2.5 bg-gray-700/60 rounded-full w-full blur-[2px]" />
                        <div className="h-2.5 bg-gray-700/60 rounded-full w-4/5 blur-[2px]" />
                        <div className="h-2.5 bg-gray-700/60 rounded-full w-3/5 blur-[2px]" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Resources ── */}
        {data.resources && data.resources.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-white mb-4">Further Reading</h2>
            <div className="space-y-2">
              {data.resources.map((r, idx) => (
                <a
                  key={idx}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-all group"
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{RESOURCE_ICONS[r.type] ?? '🔗'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium group-hover:text-indigo-300 transition-colors truncate">{r.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{r.description}</p>
                  </div>
                  <span className="text-gray-600 group-hover:text-gray-400 flex-shrink-0 mt-0.5 transition-colors">↗</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Completion CTA ── */}
        <div className={`rounded-2xl border p-6 mb-6 transition-all duration-500 ${
          allRead && !isCompleted
            ? 'border-emerald-700/60 bg-emerald-950/20'
            : 'border-gray-800 bg-gray-900'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white font-semibold">
                {isCompleted ? '✓ Module completed!' : allRead ? 'Ready to mark complete!' : 'Mark as complete when done'}
              </p>
              <p className="text-gray-500 text-sm mt-0.5">
                {isCompleted
                  ? 'You earned +20 XP for this module'
                  : allRead
                  ? 'You\'ve read all sections. Earn +20 XP!'
                  : `${readCount}/${totalSections} sections read · complete all to unlock`}
              </p>
            </div>

            <div className="relative flex-shrink-0">
              {xpToast && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap animate-bounce">
                  +20 XP
                </span>
              )}
              <button
                onClick={handleComplete}
                disabled={isCompleted || completing}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isCompleted
                    ? 'bg-emerald-950/40 border border-emerald-700/50 text-emerald-400 cursor-default'
                    : allRead
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                } ${completing ? 'opacity-60' : ''}`}
              >
                {isCompleted ? (
                  <><span>✓</span> Completed</>
                ) : completing ? (
                  <><span className="animate-spin">⟳</span> Saving…</>
                ) : (
                  <><span>📚</span> Mark as Complete · +20 XP</>
                )}
              </button>
            </div>
          </div>

          {/* Progress bar inside CTA */}
          {!isCompleted && totalSections > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                <span>Sections read</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: progressPct === 100 ? '#10b981' : '#6366f1',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <div className="flex justify-between">
          {data.prevId ? (
            <Link href={`/modules/${data.prevId}`} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              ← {data.prevTitle}
            </Link>
          ) : <div />}
          {data.nextId ? (
            <Link href={`/modules/${data.nextId}`} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              {data.nextTitle} →
            </Link>
          ) : (
            <Link href="/practice" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors">
              Start Practice →
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
