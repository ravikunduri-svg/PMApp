import { NextRequest, NextResponse } from 'next/server'
import { scoreAnswer } from '@/lib/groq'
import { getQuestionById } from '@/lib/questions'
import { adminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { session_id, question_id, answer, answer_type, user_id } = await req.json()

    if (!session_id || !question_id || !answer || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const question = getQuestionById(question_id)
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // MCQ: score without Groq
    if (answer_type === 'mcq' && question.mcq_options) {
      const selectedIndex = parseInt(answer, 10)
      const correct = question.mcq_options.find((o) => o.is_correct)
      const selected = question.mcq_options[selectedIndex]
      const isCorrect = selected?.is_correct ?? false
      const score = isCorrect ? 8 : 3

      const result = {
        question_id,
        question_text: question.text,
        answer,
        answer_type: 'mcq' as const,
        scores: Object.fromEntries(question.dimensions.map((d) => [d, score])),
        feedback: Object.fromEntries(
          question.dimensions.map((d) => [
            d,
            isCorrect
              ? `Correct! ${correct?.explanation ?? ''}`
              : `Incorrect. ${selected?.explanation ?? ''} Correct answer: ${correct?.text}`,
          ])
        ),
        overall_score: score,
        top_strength: isCorrect ? 'Correct concept knowledge' : '',
        biggest_gap: isCorrect ? '' : 'Review the correct concept',
        improvement_tip: isCorrect
          ? 'Good. Apply this concept in practice answers.'
          : `Correct answer: "${correct?.text}". ${correct?.explanation}`,
      }

      await appendQuestionResult(session_id, result)
      return NextResponse.json(result)
    }

    // Text/Voice: score with Groq
    const { data: session } = await adminClient
      .from('practice_sessions')
      .select('archetype')
      .eq('id', session_id)
      .single()

    const scoring = await scoreAnswer(
      question.text,
      answer,
      question.dimensions,
      question.ideal_answer_outline,
      session?.archetype
    )

    const result = {
      question_id,
      question_text: question.text,
      answer,
      answer_type,
      scores: scoring.scores,
      feedback: scoring.feedback,
      overall_score: scoring.overall_score,
      top_strength: scoring.top_strength,
      biggest_gap: scoring.biggest_gap,
      improvement_tip: scoring.improvement_tip,
    }

    await appendQuestionResult(session_id, result)
    return NextResponse.json(result)
  } catch (err) {
    console.error('score-answer error:', err)
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 })
  }
}

async function appendQuestionResult(sessionId: string, result: Record<string, unknown>) {
  // Fetch current results
  const { data: session } = await adminClient
    .from('practice_sessions')
    .select('question_results, answers')
    .eq('id', sessionId)
    .single()

  const existing: unknown[] = session?.question_results ?? []
  existing.push(result)

  // Recompute session-level scores
  const allScored = existing as { scores: Record<string, number | null>; answer_type: string }[]
  const dimTotals: Record<string, { sum: number; count: number }> = {}

  for (const r of allScored) {
    for (const [dim, score] of Object.entries(r.scores ?? {})) {
      if (score === null || score === undefined) continue
      if (!dimTotals[dim]) dimTotals[dim] = { sum: 0, count: 0 }
      dimTotals[dim].sum += score
      dimTotals[dim].count++
    }
  }

  const scores: Record<string, number | null> = {
    problem_framing: null,
    user_empathy: null,
    structured_thinking: null,
    prioritization: null,
    metrics_reasoning: null,
    communication_clarity: null,
  }
  let overallSum = 0
  let overallCount = 0

  for (const [dim, { sum, count }] of Object.entries(dimTotals)) {
    scores[dim] = Math.round((sum / count) * 10) / 10
    overallSum += sum / count
    overallCount++
  }

  const overallScore = overallCount > 0 ? Math.round((overallSum / overallCount) * 10) / 10 : null

  await adminClient
    .from('practice_sessions')
    .update({
      question_results: existing,
      scores,
      overall_score: overallScore,
    })
    .eq('id', sessionId)
}
