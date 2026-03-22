'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase-client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type MCQOption = { option: string; text: string; is_correct: boolean; explanation: string }

type Question = {
  id: string
  text: string
  answer_mode: 'mcq' | 'text' | 'voice'
  dimensions: string[]
  mcq_options: MCQOption[] | null
  time_limit_seconds: number
}

type QuestionResult = {
  question_id: string
  overall_score: number
  top_strength: string
  biggest_gap: string
  improvement_tip: string
  feedback: Record<string, string>
  scores: Record<string, number | null>
}

const DIM_LABELS: Record<string, string> = {
  problem_framing: 'Problem Framing',
  user_empathy: 'User Empathy',
  structured_thinking: 'Structured Thinking',
  prioritization: 'Prioritization',
  metrics_reasoning: 'Metrics Reasoning',
  communication_clarity: 'Communication',
}

export default function ActiveTestPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const router = useRouter()
  const supabase = createBrowserClient()

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [selectedMCQ, setSelectedMCQ] = useState<number | null>(null)
  const [scoring, setScoring] = useState(false)
  const [result, setResult] = useState<QuestionResult | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      const { data: session } = await supabase
        .from('practice_sessions')
        .select('questions, status')
        .eq('id', sessionId)
        .single()

      if (!session) { router.push('/practice'); return }
      if (session.status === 'complete') { router.push(`/report/${sessionId}`); return }
      setQuestions(session.questions ?? [])
    }
    load()
  }, [sessionId])

  const currentQ = questions[currentIdx]
  const isLastQuestion = currentIdx === questions.length - 1

  async function submitAnswer() {
    if (!currentQ || !userId) return
    if (currentQ.answer_mode === 'mcq' && selectedMCQ === null) return
    if (currentQ.answer_mode !== 'mcq' && !answer.trim()) return

    setScoring(true)
    setError('')

    try {
      const res = await fetch('/api/score-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: currentQ.id,
          answer: currentQ.answer_mode === 'mcq' ? String(selectedMCQ) : answer,
          answer_type: currentQ.answer_mode,
          user_id: userId,
        }),
      })

      if (!res.ok) throw new Error('Scoring failed')
      const scored: QuestionResult = await res.json()
      setResult(scored)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scoring failed')
    } finally {
      setScoring(false)
    }
  }

  async function nextQuestion() {
    if (isLastQuestion) {
      // Mark session complete
      await supabase
        .from('practice_sessions')
        .update({ status: 'complete', completed_at: new Date().toISOString() })
        .eq('id', sessionId)
      setDone(true)
      router.push(`/report/${sessionId}`)
      return
    }
    setCurrentIdx((i) => i + 1)
    setAnswer('')
    setSelectedMCQ(null)
    setResult(null)
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading questions…</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-white font-semibold">Test complete! Redirecting to report…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">← Exit</Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-6 rounded-full ${
                    i < currentIdx ? 'bg-emerald-500' :
                    i === currentIdx ? 'bg-indigo-500' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <div />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {!result ? (
          /* Question card */
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                currentQ.answer_mode === 'mcq'
                  ? 'bg-amber-950/40 text-amber-400 border-amber-800/50'
                  : 'bg-indigo-950/40 text-indigo-400 border-indigo-800/50'
              }`}>
                {currentQ.answer_mode === 'mcq' ? 'Multiple Choice' : 'Text Answer'}
              </span>
              <span className="text-xs text-gray-500">
                Tests: {currentQ.dimensions.map((d) => DIM_LABELS[d] ?? d).join(', ')}
              </span>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
              <p className="text-white text-lg leading-relaxed">{currentQ.text}</p>
            </div>

            {currentQ.answer_mode === 'mcq' && currentQ.mcq_options ? (
              <div className="space-y-3 mb-6">
                {currentQ.mcq_options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedMCQ(i)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedMCQ === i
                        ? 'border-indigo-500 bg-indigo-950/30'
                        : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-indigo-400 font-mono text-sm mr-3">{opt.option}.</span>
                    <span className="text-gray-200 text-sm">{opt.text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mb-6">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here. Think out loud — structure your response before writing."
                  rows={8}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm resize-none"
                />
                <p className="text-xs text-gray-600 mt-1 text-right">{answer.length} chars</p>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm mb-4 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={submitAnswer}
              disabled={
                scoring ||
                (currentQ.answer_mode === 'mcq' && selectedMCQ === null) ||
                (currentQ.answer_mode !== 'mcq' && answer.trim().length < 20)
              }
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {scoring ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span> Scoring with AI…
                </span>
              ) : 'Submit Answer'}
            </button>
          </div>
        ) : (
          /* Result card */
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className={`text-3xl font-bold ${
                result.overall_score >= 7 ? 'text-emerald-400' :
                result.overall_score >= 5 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {result.overall_score}/10
              </div>
              <div>
                <p className="text-white font-medium">Question scored</p>
                <p className="text-gray-400 text-xs">{currentQ.dimensions.map((d) => DIM_LABELS[d] ?? d).join(', ')}</p>
              </div>
            </div>

            {/* Dimension scores */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
              <h3 className="text-white font-medium mb-4 text-sm">Dimension Scores</h3>
              <div className="space-y-3">
                {Object.entries(result.scores)
                  .filter(([, v]) => v !== null)
                  .map(([dim, score]) => (
                    <div key={dim}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-400">{DIM_LABELS[dim] ?? dim}</span>
                        <span className={`text-xs font-mono font-medium ${
                          (score as number) >= 7 ? 'text-emerald-400' :
                          (score as number) >= 5 ? 'text-amber-400' : 'text-red-400'
                        }`}>{score}/10</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full ${
                            (score as number) >= 7 ? 'bg-emerald-500' :
                            (score as number) >= 5 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${((score as number) / 10) * 100}%` }}
                        />
                      </div>
                      {result.feedback[dim] && (
                        <p className="text-xs text-gray-500 mt-1">{result.feedback[dim]}</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Feedback */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {result.top_strength && (
                <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4">
                  <p className="text-xs text-emerald-400 font-medium mb-1">Strength</p>
                  <p className="text-sm text-gray-300">{result.top_strength}</p>
                </div>
              )}
              {result.biggest_gap && (
                <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4">
                  <p className="text-xs text-red-400 font-medium mb-1">Gap</p>
                  <p className="text-sm text-gray-300">{result.biggest_gap}</p>
                </div>
              )}
              {result.improvement_tip && (
                <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 sm:col-span-2">
                  <p className="text-xs text-amber-400 font-medium mb-1">Improvement Tip</p>
                  <p className="text-sm text-gray-300">{result.improvement_tip}</p>
                </div>
              )}
            </div>

            <button
              onClick={nextQuestion}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {isLastQuestion ? 'Finish & See Report →' : 'Next Question →'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
