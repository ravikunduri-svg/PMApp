'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export interface CelebrationData {
  xpEarned: number
  newBadges: { id: string; name: string; icon: string }[]
  leveledUp: boolean
  oldLevel: number
  level: number
  levelName: string
  sessionId: string
}

interface Props {
  data: CelebrationData
}

export default function SessionCelebration({ data }: Props) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  // Fade in after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  function goToReport() {
    router.push(`/report/${data.sessionId}`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(3,7,18,0.97)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* Decorative sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="absolute text-xl"
            style={{
              left: `${8 + (i * 8) % 90}%`,
              top: `${5 + (i * 13) % 80}%`,
              animation: `float-${(i % 3) + 1} ${2 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.3) % 1.5}s`,
              opacity: 0.6,
            }}
          >
            {['✨', '⭐', '🌟'][i % 3]}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes float-1 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-18px) rotate(15deg)} }
        @keyframes float-2 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-12px) rotate(-10deg)} }
        @keyframes float-3 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-22px) rotate(8deg)} }
        @keyframes pop-in  { 0%{transform:scale(0.7);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      <div
        className="relative max-w-sm w-full text-center"
        style={{ animation: 'pop-in 0.5s ease forwards' }}
      >
        {/* Main emoji */}
        <div className="text-6xl mb-4">🎉</div>

        <h2 className="text-2xl font-bold text-white mb-1">Session Complete!</h2>
        <p className="text-gray-400 text-sm mb-6">Here's what you earned</p>

        {/* XP earned */}
        <div className="bg-indigo-950/60 border border-indigo-700/60 rounded-2xl px-8 py-5 mb-4">
          <p className="text-xs text-indigo-400 uppercase tracking-widest mb-1">XP Earned</p>
          <p className="text-5xl font-black text-indigo-300">+{data.xpEarned}</p>
          <p className="text-xs text-gray-500 mt-1">Total: {data.xpEarned} XP this session</p>
        </div>

        {/* Level up */}
        {data.leveledUp && (
          <div className="bg-amber-950/40 border border-amber-700/50 rounded-xl px-5 py-3 mb-4 flex items-center gap-3">
            <span className="text-2xl">🆙</span>
            <div className="text-left">
              <p className="text-amber-300 font-semibold text-sm">Level Up!</p>
              <p className="text-gray-400 text-xs">
                Level {data.oldLevel} → Level {data.level} · <span className="text-white">{data.levelName}</span>
              </p>
            </div>
          </div>
        )}

        {/* New badges */}
        {data.newBadges.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">New Badge{data.newBadges.length > 1 ? 's' : ''}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {data.newBadges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-700/50 rounded-xl px-3 py-2"
                >
                  <span className="text-lg">{b.icon}</span>
                  <span className="text-emerald-300 text-sm font-medium">{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={goToReport}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors mt-2"
        >
          See Full Report →
        </button>
      </div>
    </div>
  )
}
