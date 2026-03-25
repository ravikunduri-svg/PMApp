import Link from 'next/link'
import { createServerSupabaseClient, adminClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

const FOUNDATION_MODULES = [
  { id: 'f1-pm-roles', title: 'PM Roles & Archetypes', emoji: '🗺️', desc: 'Consumer, B2B, and Technical PM paths — and how they differ.' },
  { id: 'f2-pm-journey', title: 'The PM Journey', emoji: '🛤️', desc: 'How PMs work across discovery, delivery, and growth.' },
  { id: 'f3-frameworks', title: 'Product Frameworks', emoji: '🏗️', desc: 'CIRCLES, RICE, jobs-to-be-done, and when to use each.' },
  { id: 'f4-product-sense', title: 'Product Sense', emoji: '🧠', desc: 'Problem framing, user empathy, and product instinct.' },
  { id: 'f5-metrics', title: 'Metrics & Prioritization', emoji: '📊', desc: 'North Star, OKRs, funnel analysis, and tradeoffs.' },
]

export default async function ModulesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/auth/login')

  const { data: profile } = await adminClient
    .from('profiles')
    .select('modules_completed')
    .eq('id', user.id)
    .maybeSingle()

  const modulesCompleted: string[] = (profile?.modules_completed as string[]) ?? []
  const completedCount = FOUNDATION_MODULES.filter((m) => modulesCompleted.includes(m.id)).length

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
            <span>🧭</span> PMPathfinder
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/modules" className="text-sm text-white">Modules</Link>
            <Link href="/practice" className="text-sm text-gray-400 hover:text-white transition-colors">Practice</Link>
            <Link href="/readiness" className="text-sm text-gray-400 hover:text-white transition-colors">JD Check</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-white">Learning Modules</h1>
          <span className="text-sm text-gray-400">
            {completedCount}/5 complete
            {completedCount === 5 && <span className="ml-2 text-emerald-400">✓ All done!</span>}
          </span>
        </div>
        <p className="text-gray-400 text-sm mb-8">5 foundation modules. Study these before practicing.</p>

        <div className="space-y-3">
          {FOUNDATION_MODULES.map((mod) => {
            const isComplete = modulesCompleted.includes(mod.id)
            return (
              <Link
                key={mod.id}
                href={`/modules/${mod.id}`}
                className="flex items-center gap-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 transition-all group"
              >
                <span className="text-3xl flex-shrink-0">{mod.emoji}</span>
                <div className="flex-1">
                  <p className="text-white font-medium group-hover:text-indigo-300 transition-colors">{mod.title}</p>
                  <p className="text-gray-400 text-sm mt-0.5">{mod.desc}</p>
                </div>
                {isComplete ? (
                  <span className="text-emerald-400 text-lg flex-shrink-0">✓</span>
                ) : (
                  <span className="text-gray-600 group-hover:text-gray-400 transition-colors">→</span>
                )}
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
