'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

const ARCHETYPES = [
  {
    id: 'consumer',
    label: 'Consumer PM',
    emoji: '📱',
    description: 'B2C apps, mobile products, consumer internet. Think: Swiggy, Instagram, Zepto.',
    strengths: ['User empathy ×1.5', 'Communication ×1.2'],
  },
  {
    id: 'b2b',
    label: 'B2B / SaaS PM',
    emoji: '🏢',
    description: 'Enterprise, SaaS, sales-assisted products. Think: Salesforce, Jira, Razorpay.',
    strengths: ['Metrics ×1.5', 'Prioritization ×1.3'],
  },
  {
    id: 'technical',
    label: 'Technical PM',
    emoji: '⚙️',
    description: 'Developer tools, infra, APIs, ML platforms. Think: Stripe, AWS, Cloudflare.',
    strengths: ['Structured thinking ×1.5', 'Problem framing ×1.2'],
  },
]

export default function OnboardingPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createBrowserClient()

  async function handleContinue() {
    if (!selected) return
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
      if (!user) { router.push('/auth/login'); return }

      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, email: user.email, archetype: selected })

      if (error) throw error
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <span className="text-4xl">🧭</span>
          <h1 className="mt-3 text-3xl font-bold text-white">What kind of PM are you preparing for?</h1>
          <p className="mt-2 text-gray-400">
            Your archetype shapes which dimensions matter most in your scoring.
          </p>
        </div>

        <div className="grid gap-4 mb-8">
          {ARCHETYPES.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a.id)}
              className={`text-left p-6 rounded-2xl border-2 transition-all ${
                selected === a.id
                  ? 'border-indigo-500 bg-indigo-950/40'
                  : 'border-gray-800 bg-gray-900 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">{a.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold text-lg">{a.label}</span>
                    {selected === a.id && (
                      <span className="text-indigo-400 text-sm font-medium">Selected</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{a.description}</p>
                  <div className="flex gap-2 mt-3">
                    {a.strengths.map((s) => (
                      <span
                        key={s}
                        className="text-xs bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 px-2 py-0.5 rounded-full"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
        )}

        <button
          onClick={handleContinue}
          disabled={!selected || loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {loading ? 'Saving…' : 'Start Preparing →'}
        </button>
      </div>
    </div>
  )
}
