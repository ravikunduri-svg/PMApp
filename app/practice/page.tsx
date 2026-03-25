'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PracticeStartPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createBrowserClient()

  async function startTest() {
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
      if (!user) { router.push('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('archetype')
        .eq('id', user.id)
        .single()

      if (!profile?.archetype) { router.push('/onboarding'); return }

      const res = await fetch('/api/select-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, archetype: profile.archetype }),
      })

      if (!res.ok) throw new Error('Failed to select questions')
      const { session_id } = await res.json()
      router.push(`/practice/${session_id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start test')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
            <span>🧭</span> PMPathfinder
          </Link>
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-20 text-center">
        <span className="text-5xl block mb-6">🎯</span>
        <h1 className="text-3xl font-bold text-white mb-3">Practice Test</h1>
        <p className="text-gray-400 mb-2">
          5 adaptive questions — selected based on your weakest dimensions.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Mix of MCQ (instant) + text (AI-scored via Groq). Takes ~10–15 minutes.
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8 text-left">
          <h3 className="text-white font-medium mb-3">What to expect</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex gap-2"><span className="text-indigo-400">✓</span> MCQ questions — instant feedback, no AI cost</li>
            <li className="flex gap-2"><span className="text-indigo-400">✓</span> Text questions — scored on 6 PM dimensions by AI</li>
            <li className="flex gap-2"><span className="text-indigo-400">✓</span> Personalized question selection based on your weak spots</li>
            <li className="flex gap-2"><span className="text-indigo-400">✓</span> Detailed feedback + improvement tip per question</li>
          </ul>
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={startTest}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {loading ? 'Selecting questions…' : 'Start Test →'}
        </button>
      </main>
    </div>
  )
}
