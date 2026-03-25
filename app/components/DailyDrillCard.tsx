'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type DrillQuestion = {
  id: string
  text: string
  dimensions: string[]
  answer_mode: string
}

type Props = {
  question: DrillQuestion
  weakestDim: string | null
  userId: string
  archetype: string
  fullQuestion: unknown  // full NormalizedQuestion for session creation
}

const DIM_LABELS: Record<string, string> = {
  problem_framing: 'Problem Framing',
  user_empathy: 'User Empathy',
  structured_thinking: 'Structured Thinking',
  prioritization: 'Prioritization',
  metrics_reasoning: 'Metrics Reasoning',
  communication_clarity: 'Communication',
}

export default function DailyDrillCard({ question, weakestDim, userId, archetype, fullQuestion }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function startDrill() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/drill/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, archetype, question: fullQuestion }),
      })
      if (!res.ok) throw new Error('Failed to start drill')
      const { session_id } = await res.json()
      router.push(`/practice/${session_id}`)
    } catch {
      setError('Could not start drill. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-amber-800/40 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Today's Drill</p>
            {weakestDim && (
              <p className="text-xs text-gray-500">Targeting your weakest: {DIM_LABELS[weakestDim] ?? weakestDim}</p>
            )}
          </div>
        </div>
        <span className="text-xs bg-amber-950/50 text-amber-400 border border-amber-800/40 px-2 py-0.5 rounded-full">
          ~3 min
        </span>
      </div>

      <p className="text-sm text-gray-200 leading-relaxed mb-4 line-clamp-3">
        {question.text}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {question.dimensions.slice(0, 2).map((d) => (
            <span key={d} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
              {DIM_LABELS[d] ?? d}
            </span>
          ))}
          <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full capitalize">
            {question.answer_mode}
          </span>
        </div>

        <button
          onClick={startDrill}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap ml-3"
        >
          {loading ? 'Starting…' : 'Start Drill →'}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
