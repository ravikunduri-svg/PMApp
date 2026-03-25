'use client'

import { useState } from 'react'

interface Props {
  moduleId: string
  initialCompleted: boolean
}

export default function MarkModuleCompleteButton({ moduleId, initialCompleted }: Props) {
  const [completed, setCompleted] = useState(initialCompleted)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  async function handleClick() {
    if (completed || loading) return
    setLoading(true)

    try {
      const res = await fetch('/api/complete-module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: moduleId }),
      })

      const data = await res.json()

      if (res.ok) {
        setCompleted(true)
        if (!data.already_complete) {
          setToast('+20 XP')
          setTimeout(() => setToast(null), 2500)
        }
      }
    } catch {
      // silent — no toast on error
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative inline-block">
      {toast && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap animate-bounce">
          {toast}
        </span>
      )}

      <button
        onClick={handleClick}
        disabled={completed || loading}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
          completed
            ? 'bg-emerald-950/40 border border-emerald-700/50 text-emerald-400 cursor-default'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60 disabled:cursor-wait'
        }`}
      >
        {completed ? (
          <>
            <span>✓</span> Completed
          </>
        ) : loading ? (
          <>
            <span className="animate-spin">⟳</span> Saving…
          </>
        ) : (
          <>
            <span>📚</span> Mark as Complete · +20 XP
          </>
        )}
      </button>
    </div>
  )
}
