import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, adminClient } from '@/lib/supabase-server'
import { getQuestionsByArchetype } from '@/lib/questions'
import type { Archetype, Dimension } from '@/lib/questions'
import InterviewCountdownCard from '@/app/components/InterviewCountdownCard'
import DailyDrillCard from '@/app/components/DailyDrillCard'
import XPLevelBar from '@/app/components/XPLevelBar'
import BadgeShowcase from '@/app/components/BadgeShowcase'

const DIM_LABELS: Record<string, string> = {
  problem_framing: 'Problem Framing',
  user_empathy: 'User Empathy',
  structured_thinking: 'Structured Thinking',
  prioritization: 'Prioritization',
  metrics_reasoning: 'Metrics Reasoning',
  communication_clarity: 'Communication',
}

function scoreColor(score: number | null) {
  if (score === null) return 'text-gray-500'
  if (score >= 7) return 'text-emerald-400'
  if (score >= 5) return 'text-amber-400'
  return 'text-red-400'
}

function ScoreBar({ score }: { score: number | null }) {
  const pct = score ? (score / 10) * 100 : 0
  const color = score === null ? 'bg-gray-700' : score >= 7 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Score trend sparkline (pure SVG, server-rendered) ─────────────────────────
function ScoreTrend({ scores }: { scores: (number | null)[] }) {
  const valid = scores.filter((s): s is number => s !== null)
  if (valid.length < 2) return null

  const W = 500
  const H = 72
  const PAD = 6

  const minVal = Math.max(0, Math.min(...valid) - 0.5)
  const maxVal = Math.min(10, Math.max(...valid) + 0.5)
  const range = maxVal - minVal || 1

  const toX = (i: number) => PAD + (i / (valid.length - 1)) * (W - PAD * 2)
  const toY = (v: number) => H - PAD - ((v - minVal) / range) * (H - PAD * 2)

  const points = valid.map((s, i) => `${toX(i)},${toY(s)}`).join(' ')
  const fillPoints = `${toX(0)},${H} ${points} ${toX(valid.length - 1)},${H}`

  const latest = valid[valid.length - 1]
  const latestX = toX(valid.length - 1)
  const latestY = toY(latest)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '72px' }}>
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines at 5 and 7 */}
      {[5, 7].map((v) => (
        <line
          key={v}
          x1={PAD} y1={toY(v)} x2={W - PAD} y2={toY(v)}
          stroke={v === 7 ? '#10b981' : '#1e2d45'}
          strokeWidth="1"
          strokeDasharray={v === 7 ? '4,3' : ''}
        />
      ))}
      {/* Fill area */}
      <polygon points={fillPoints} fill="url(#tg)" />
      {/* Line */}
      <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Session dots */}
      {valid.map((s, i) => (
        <circle key={i} cx={toX(i)} cy={toY(s)} r="3" fill={i === valid.length - 1 ? '#6366f1' : '#1e2d45'} stroke="#6366f1" strokeWidth="1.5" />
      ))}
      {/* Latest score label */}
      <circle cx={latestX} cy={latestY} r="4" fill="#6366f1" />
      <text x={latestX - 4} y={latestY - 10} fill="#a5b4fc" fontSize="10" fontFamily="Inter,sans-serif" fontWeight="600" textAnchor="middle">
        {latest}
      </text>
      {/* Mastery line label */}
      <text x={W - PAD - 2} y={toY(7) - 3} fill="#10b981" fontSize="9" fontFamily="Inter,sans-serif" textAnchor="end">mastery 7</text>
    </svg>
  )
}

// ── Streak helper ────────────────────────────────────────────────────────────
function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  const dayMs = 86_400_000
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daySet = new Set(
    dates.map((d) => {
      const dt = new Date(d)
      dt.setHours(0, 0, 0, 0)
      return dt.getTime()
    })
  )

  let check = today.getTime()
  // Allow today or yesterday as the streak start
  if (!daySet.has(check)) {
    check -= dayMs
    if (!daySet.has(check)) return 0
  }

  let streak = 0
  while (daySet.has(check)) {
    streak++
    check -= dayMs
  }
  return streak
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/auth/login')

  const { data: profile } = await adminClient
    .from('profiles')
    .select('archetype, email, interview_date, streak_count, streak_last_active, daily_drill_date, daily_drill_qid, xp_total, level, badges_earned, modules_completed')
    .eq('id', user.id)
    .single()

  if (!profile?.archetype) redirect('/onboarding')

  // Fetch recent 5 for display, and all completed for accurate stats
  const [{ data: sessions }, { data: allCompleted }] = await Promise.all([
    adminClient
      .from('practice_sessions')
      .select('id, status, scores, overall_score, created_at, attempt_number')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    adminClient
      .from('practice_sessions')
      .select('scores, overall_score, created_at, question_results')
      .eq('user_id', user.id)
      .eq('status', 'complete')
      .order('created_at', { ascending: true }),
  ])

  const allCompletedSessions = allCompleted ?? []
  const totalCompleted = allCompletedSessions.length

  // Avg scores across ALL completed sessions
  const dimTotals: Record<string, { sum: number; count: number }> = {}
  for (const s of allCompletedSessions) {
    for (const [dim, score] of Object.entries(s.scores ?? {})) {
      if (score === null) continue
      if (!dimTotals[dim]) dimTotals[dim] = { sum: 0, count: 0 }
      dimTotals[dim].sum += score as number
      dimTotals[dim].count++
    }
  }
  const avgScores: Record<string, number | null> = {}
  for (const dim of Object.keys(DIM_LABELS)) {
    avgScores[dim] = dimTotals[dim]
      ? Math.round((dimTotals[dim].sum / dimTotals[dim].count) * 10) / 10
      : null
  }

  // ── Derived stats ────────────────────────────────────────────────────────────
  const avgOverall = totalCompleted > 0
    ? Math.round(
        allCompletedSessions.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) / totalCompleted * 10
      ) / 10
    : null

  const masteredCount = Object.values(avgScores).filter((v) => v !== null && v >= 7).length

  // Weakest scored dimension
  let weakestDim: string | null = null
  let weakestScore = Infinity
  for (const [dim, score] of Object.entries(avgScores)) {
    if (score !== null && score < weakestScore) {
      weakestScore = score
      weakestDim = dim
    }
  }
  const weakestGap = weakestDim ? Math.round((7 - weakestScore) * 10) / 10 : null

  // ── Daily drill selection ─────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]

  let drillQuestion = null as import('@/lib/questions').NormalizedQuestion | null

  if (profile.archetype) {
    const masteredIds = new Set(
      allCompletedSessions
        .flatMap((s) => (s.question_results as { question_id: string; overall_score: number }[] ?? []))
        .filter((r) => r.overall_score >= 7)
        .map((r) => r.question_id)
    )

    if (profile.daily_drill_date === todayStr && profile.daily_drill_qid) {
      // Use cached drill for today
      const { getQuestionById } = await import('@/lib/questions')
      drillQuestion = getQuestionById(profile.daily_drill_qid) ?? null
    } else {
      // Pick a new drill: weakest-dim questions not mastered
      const candidates = getQuestionsByArchetype(profile.archetype as Archetype)
        .filter((q) => !masteredIds.has(q.id))
        .filter((q) => weakestDim ? q.dimensions.includes(weakestDim as Dimension) : true)

      if (candidates.length > 0) {
        const seed = [...todayStr].reduce((acc, c) => acc + c.charCodeAt(0), 0)
        drillQuestion = candidates[seed % candidates.length]
        await adminClient
          .from('profiles')
          .update({ daily_drill_date: todayStr, daily_drill_qid: drillQuestion.id })
          .eq('id', user.id)
      }
    }
  }

  // ── Interview countdown ───────────────────────────────────────────────────────
  const interviewDate = (profile.interview_date as string | null) ?? null
  const daysRemaining = interviewDate
    ? Math.ceil((new Date(interviewDate + 'T00:00:00').getTime() - Date.now()) / 86_400_000)
    : null
  const readinessPct = avgOverall !== null ? Math.min(100, Math.round((avgOverall / 10) * 100)) : 0

  // ── Streak (persisted) + recovery window ─────────────────────────────────────
  const persistedStreak = (profile.streak_count as number) ?? 0
  const lastActive = (profile.streak_last_active as string | null) ?? null
  const showRecovery = lastActive === yesterdayStr && persistedStreak > 0

  // Score delta: latest vs previous
  const last2 = allCompletedSessions.slice(-2)
  const scoreDelta = last2.length === 2 && last2[0].overall_score != null && last2[1].overall_score != null
    ? Math.round((last2[1].overall_score - last2[0].overall_score) * 10) / 10
    : null

  // Score trend (chronological list of overall scores)
  const scoreTrend = allCompletedSessions.map((s) => s.overall_score as number | null)

  // Practice streak — use persisted value, fall back to computed for existing users
  const streak = persistedStreak > 0
    ? persistedStreak
    : computeStreak(allCompletedSessions.map((s) => s.created_at))

  // Total questions answered
  const totalQuestions = allCompletedSessions.reduce((sum, s) => {
    const qr = s.question_results
    return sum + (Array.isArray(qr) ? qr.length : 0)
  }, 0)

  // Per-session delta for recent tests list
  const recentCompleted = (sessions ?? []).filter((s) => s.status === 'complete')
  const sessionDeltas: Record<string, number | null> = {}
  for (let i = 0; i < recentCompleted.length; i++) {
    const curr = recentCompleted[i]
    const prev = recentCompleted[i + 1]
    sessionDeltas[curr.id] =
      curr.overall_score != null && prev?.overall_score != null
        ? Math.round((curr.overall_score - prev.overall_score) * 10) / 10
        : null
  }

  const archetypeLabel =
    profile.archetype === 'b2b' ? 'B2B PM' :
    profile.archetype === 'consumer' ? 'Consumer PM' : 'Technical PM'

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
            <span>🧭</span> PMPathfinder
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/modules" className="text-sm text-gray-400 hover:text-white transition-colors">Modules</Link>
            <Link href="/practice" className="text-sm text-gray-400 hover:text-white transition-colors">Practice</Link>
            <Link href="/readiness" className="text-sm text-gray-400 hover:text-white transition-colors">JD Check</Link>
            <Link href="/resume" className="text-sm text-gray-400 hover:text-white transition-colors">Resume</Link>
            <Link href="/knowledge" className="text-sm text-gray-400 hover:text-white transition-colors">Knowledge</Link>
            <form action="/api/auth/signout" method="POST">
              <button className="text-sm text-gray-500 hover:text-white transition-colors">Sign out</button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <span className="text-xs bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 px-2 py-0.5 rounded-full">
              {archetypeLabel}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            {totalCompleted === 0
              ? 'Complete your first practice test to see your scores.'
              : `${totalCompleted} test${totalCompleted > 1 ? 's' : ''} completed · ${totalQuestions} questions answered`}
          </p>
        </div>

        {/* ── 6-tile stats row ── */}
        {totalCompleted > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {/* Tests completed */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Tests done</p>
              <p className="text-2xl font-bold text-white">{totalCompleted}</p>
              <p className="text-xs text-gray-500 mt-1">
                {totalCompleted < 3 ? `${3 - totalCompleted} to JD unlock` : 'JD unlocked ✓'}
              </p>
            </div>

            {/* Avg score */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Avg score</p>
              <p className={`text-2xl font-bold ${scoreColor(avgOverall)}`}>
                {avgOverall ?? '—'}<span className="text-sm font-normal text-gray-500">/10</span>
              </p>
              {scoreDelta !== null && (
                <p className={`text-xs mt-1 font-medium ${scoreDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {scoreDelta >= 0 ? '▲' : '▼'} {Math.abs(scoreDelta)} vs prev
                </p>
              )}
            </div>

            {/* Streak */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Streak</p>
              <p className="text-2xl font-bold text-orange-400">
                {streak > 0 ? `🔥 ${streak}` : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {streak > 0 ? `day${streak > 1 ? 's' : ''} in a row` : 'Practice today'}
              </p>
            </div>

            {/* Questions answered */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Questions</p>
              <p className="text-2xl font-bold text-sky-400">{totalQuestions}</p>
              <p className="text-xs text-gray-500 mt-1">answered total</p>
            </div>

            {/* Focus area */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Focus area</p>
              {weakestDim ? (
                <>
                  <p className="text-sm font-semibold text-amber-400 leading-tight mt-1">{DIM_LABELS[weakestDim]}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {weakestScore.toFixed(1)}/10
                    {weakestGap !== null && weakestGap > 0 && ` · ${weakestGap} gap`}
                  </p>
                </>
              ) : (
                <p className="text-xl font-bold text-emerald-400 mt-1">All ✓</p>
              )}
            </div>

            {/* Mastered */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Mastered</p>
              <p className="text-2xl font-bold text-emerald-400">
                {masteredCount}<span className="text-sm font-normal text-gray-500">/6</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">dims ≥ 7.0</p>
            </div>
          </div>
        )}

        {/* ── XP + Level bar ── */}
        <XPLevelBar xpTotal={(profile.xp_total as number) ?? 0} />

        {/* ── Streak recovery banner ── */}
        {showRecovery && (
          <div className="mb-4 bg-amber-950/30 border border-amber-700/40 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔥</span>
              <div>
                <p className="text-sm font-semibold text-amber-300">Your {persistedStreak}-day streak is at risk!</p>
                <p className="text-xs text-amber-500/80">You haven't practiced today. Complete any session or drill to keep it alive.</p>
              </div>
            </div>
            <Link href="/practice" className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-lg whitespace-nowrap transition-colors">
              Practice now →
            </Link>
          </div>
        )}

        {/* ── Interview countdown + Daily drill (side by side) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <InterviewCountdownCard
            interviewDate={interviewDate}
            daysRemaining={daysRemaining}
            readinessPct={readinessPct}
          />
          {drillQuestion ? (
            <DailyDrillCard
              question={{ id: drillQuestion.id, text: drillQuestion.text, dimensions: drillQuestion.dimensions, answer_mode: drillQuestion.answer_mode }}
              weakestDim={weakestDim}
              userId={user.id}
              archetype={profile.archetype!}
              fullQuestion={drillQuestion}
            />
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2">
              <span className="text-2xl">⚡</span>
              <p className="text-sm font-semibold text-white">No drill today</p>
              <p className="text-xs text-gray-500">Complete a practice test to unlock daily drills.</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link href="/practice" className="bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-2xl p-5 flex items-center gap-4">
            <span className="text-3xl">🎯</span>
            <div>
              <p className="font-semibold text-white">Start Practice</p>
              <p className="text-indigo-200 text-xs">5 adaptive questions</p>
            </div>
          </Link>
          <Link href="/modules" className="bg-gray-900 hover:bg-gray-800 border border-gray-800 transition-colors rounded-2xl p-5 flex items-center gap-4">
            <span className="text-3xl">📚</span>
            <div>
              <p className="font-semibold text-white">Learn</p>
              <p className="text-gray-400 text-xs">5 foundation modules</p>
            </div>
          </Link>
          <Link href="/readiness" className={`${totalCompleted >= 3 ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-900 opacity-50 cursor-not-allowed pointer-events-none'} border border-gray-800 transition-colors rounded-2xl p-5 flex items-center gap-4`}>
            <span className="text-3xl">📋</span>
            <div>
              <p className="font-semibold text-white">JD Readiness</p>
              <p className="text-gray-400 text-xs">
                {totalCompleted >= 3
                  ? 'Paste a job description'
                  : `Unlock after ${3 - totalCompleted} more test${3 - totalCompleted > 1 ? 's' : ''}`}
              </p>
            </div>
          </Link>
        </div>

        {/* ── Score trend card (full width) ── */}
        {scoreTrend.filter(Boolean).length >= 2 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white">Score Trend</h2>
                <p className="text-xs text-gray-500 mt-0.5">Overall score across all {totalCompleted} tests · green dashed = mastery threshold</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Latest</p>
                <p className={`text-lg font-bold font-mono ${scoreColor(scoreTrend[scoreTrend.length - 1])}`}>
                  {scoreTrend[scoreTrend.length - 1]}/10
                </p>
              </div>
            </div>
            <ScoreTrend scores={scoreTrend} />
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>Test 1</span>
              <span>Test {totalCompleted}</span>
            </div>
          </div>
        )}

        {/* ── Badge showcase ── */}
        <BadgeShowcase badgesEarned={(profile.badges_earned as { id: string; earned_at: string }[]) ?? []} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dimension Scores */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-4">Dimension Scores</h2>
            {totalCompleted === 0 ? (
              <p className="text-gray-500 text-sm">Complete a practice test to see scores.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(DIM_LABELS).map(([key, label]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300 flex items-center gap-1.5">
                        {label}
                        {avgScores[key] !== null && avgScores[key]! >= 7 && (
                          <span className="text-xs text-emerald-500">✓</span>
                        )}
                      </span>
                      <span className={`text-sm font-mono font-medium ${scoreColor(avgScores[key])}`}>
                        {avgScores[key] !== null ? `${avgScores[key]}/10` : '—'}
                      </span>
                    </div>
                    <ScoreBar score={avgScores[key]} />
                  </div>
                ))}
              </div>
            )}

            {/* Focus area callout */}
            {weakestDim && weakestGap !== null && weakestGap > 0 && (
              <div className="mt-5 bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-amber-400 font-semibold">Next focus</p>
                  <p className="text-sm text-white mt-0.5">{DIM_LABELS[weakestDim]}</p>
                  <p className="text-xs text-gray-500">{weakestGap} pts to mastery</p>
                </div>
                <Link href="/practice" className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                  Practice →
                </Link>
              </div>
            )}
          </div>

          {/* Recent Tests */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-4">Recent Tests</h2>
            {!sessions || sessions.length === 0 ? (
              <p className="text-gray-500 text-sm">No tests yet.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => {
                  const delta = sessionDeltas[s.id] ?? null
                  return (
                    <div key={s.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-300">
                          Test #{s.attempt_number}
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                            s.status === 'complete' ? 'bg-emerald-950/50 text-emerald-400'
                            : s.status === 'in_progress' ? 'bg-amber-950/50 text-amber-400'
                            : 'bg-gray-800 text-gray-500'
                          }`}>
                            {s.status}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {delta !== null && (
                          <span className={`text-xs font-medium ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {delta >= 0 ? '▲' : '▼'}{Math.abs(delta)}
                          </span>
                        )}
                        {s.overall_score && (
                          <span className={`text-sm font-mono font-semibold ${scoreColor(s.overall_score)}`}>
                            {s.overall_score}/10
                          </span>
                        )}
                        {s.status === 'complete' && (
                          <Link
                            href={`/report/${s.id}`}
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* JD unlock progress */}
            {totalCompleted < 3 && (
              <div className="mt-5 pt-4 border-t border-gray-800">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>JD Readiness unlock</span>
                  <span>{totalCompleted}/3 tests</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${(totalCompleted / 3) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
