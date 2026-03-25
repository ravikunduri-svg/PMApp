import { BADGE_DEFS, type BadgeId } from '@/lib/gamification'

interface EarnedBadge {
  id: string
  earned_at: string
}

interface Props {
  badgesEarned: EarnedBadge[]
}

export default function BadgeShowcase({ badgesEarned }: Props) {
  const earnedIds = new Set(badgesEarned.map((b) => b.id))
  const earnedMap = Object.fromEntries(badgesEarned.map((b) => [b.id, b.earned_at]))

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Badges</h2>
        <span className="text-xs text-gray-500">
          {badgesEarned.length}/{BADGE_DEFS.length} earned
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {BADGE_DEFS.map((badge) => {
          const earned = earnedIds.has(badge.id as BadgeId)
          return (
            <div
              key={badge.id}
              className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                earned
                  ? 'bg-indigo-950/30 border-indigo-800/60'
                  : 'bg-gray-800/30 border-gray-800 opacity-40'
              }`}
              title={earned
                ? `Earned ${new Date(earnedMap[badge.id]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                : badge.desc}
            >
              <span className="text-2xl mb-1.5">{badge.icon}</span>
              <p className={`text-xs font-medium leading-tight ${earned ? 'text-white' : 'text-gray-400'}`}>
                {badge.name}
              </p>
              {!earned && (
                <span className="text-xs text-gray-600 mt-0.5">🔒</span>
              )}
              {earned && (
                <p className="text-xs text-indigo-400 mt-0.5">
                  {new Date(earnedMap[badge.id]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
