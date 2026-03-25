'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  interviewDate: string | null   // YYYY-MM-DD or null
  daysRemaining: number | null
  readinessPct: number
}

export default function InterviewCountdownCard({ interviewDate, daysRemaining, readinessPct }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(!interviewDate)
  const [dateInput, setDateInput] = useState(interviewDate ?? '')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function saveDate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!dateInput) return

    const res = await fetch('/api/set-interview-date', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interview_date: dateInput }),
    })

    if (!res.ok) {
      setError('Could not save date. Try again.')
      return
    }

    setEditing(false)
    startTransition(() => router.refresh())
  }

  const barColor =
    readinessPct >= 80 ? 'bg-emerald-500' :
    readinessPct >= 60 ? 'bg-amber-500' : 'bg-red-500'

  const urgency =
    daysRemaining !== null && daysRemaining <= 3 ? 'text-red-400' :
    daysRemaining !== null && daysRemaining <= 7 ? 'text-amber-400' : 'text-indigo-300'

  if (editing) {
    return (
      <div className="bg-gray-900 border border-indigo-800/40 rounded-2xl p-5">
        <p className="text-sm font-semibold text-white mb-1">Set your interview date</p>
        <p className="text-xs text-gray-500 mb-3">We'll show you a countdown and track readiness.</p>
        <form onSubmit={saveDate} className="flex items-center gap-2">
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 flex-1"
          />
          <button
            type="submit"
            disabled={isPending}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
          {interviewDate && (
            <button type="button" onClick={() => setEditing(false)} className="text-gray-500 hover:text-white text-sm px-2">
              Cancel
            </button>
          )}
        </form>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-indigo-800/40 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Interview countdown</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${urgency}`}>
              {daysRemaining === null ? '—' : daysRemaining <= 0 ? 'Today!' : `${daysRemaining}`}
            </span>
            {daysRemaining !== null && daysRemaining > 0 && (
              <span className="text-gray-500 text-sm">days left</span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            {interviewDate ? new Date(interviewDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-0.5">Readiness</p>
          <p className={`text-2xl font-bold ${barColor.replace('bg-', 'text-')}`}>{readinessPct}%</p>
        </div>
      </div>

      {/* Readiness bar */}
      <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${readinessPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {readinessPct >= 80 ? 'You\'re on track. Keep the streak alive.' :
           readinessPct >= 60 ? 'Getting there. Daily drills will close the gap.' :
           'Focus on your weakest dimension daily.'}
        </p>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors ml-3 whitespace-nowrap"
        >
          Change date
        </button>
      </div>
    </div>
  )
}
