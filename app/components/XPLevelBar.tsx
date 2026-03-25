import { computeLevel } from '@/lib/gamification'

interface Props {
  xpTotal: number
}

export default function XPLevelBar({ xpTotal }: Props) {
  const info = computeLevel(xpTotal)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Level {info.level}</p>
          <p className="text-white font-semibold">{info.name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono font-medium text-indigo-400">{xpTotal} XP</p>
          {info.nextMinXp !== null ? (
            <p className="text-xs text-gray-600">{info.nextMinXp - xpTotal} to next level</p>
          ) : (
            <p className="text-xs text-emerald-500">Max level!</p>
          )}
        </div>
      </div>

      <div className="w-full bg-gray-800 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-indigo-500 transition-all"
          style={{ width: `${info.progress}%` }}
        />
      </div>

      <div className="flex justify-between mt-1.5 text-xs text-gray-600">
        <span>{info.minXp} XP</span>
        {info.nextMinXp !== null ? (
          <span>{info.nextMinXp} XP</span>
        ) : (
          <span>🏆 Mastered</span>
        )}
      </div>
    </div>
  )
}
