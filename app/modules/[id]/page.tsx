import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const DATA_DIR = path.join(process.cwd(), 'data')

const MODULE_FILES: Record<string, string> = {
  'f1-pm-roles': 'module-f1-pm-roles.md',
  'f2-pm-journey': 'module-f2-pm-journey.json',
  'f3-frameworks': 'module-f3-frameworks.json',
  'f4-product-sense': 'module-f4-product-sense.json',
  'f5-metrics': 'module-f5-metrics.json',
}

const MODULE_TITLES: Record<string, string> = {
  'f1-pm-roles': 'PM Roles & Archetypes',
  'f2-pm-journey': 'The PM Journey',
  'f3-frameworks': 'Product Frameworks',
  'f4-product-sense': 'Product Sense',
  'f5-metrics': 'Metrics & Prioritization',
}

function loadModuleContent(id: string): { title: string; sections: { heading: string; body: string }[] } | null {
  const filename = MODULE_FILES[id]
  if (!filename) return null

  const filepath = path.join(DATA_DIR, filename)
  if (!fs.existsSync(filepath)) return null

  const title = MODULE_TITLES[id]

  if (filename.endsWith('.json')) {
    const raw = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
    // JSON modules have different shapes — normalize to sections
    const sections: { heading: string; body: string }[] = []

    if (raw.overview) sections.push({ heading: 'Overview', body: raw.overview })
    if (raw.introduction) sections.push({ heading: 'Introduction', body: raw.introduction })
    if (raw.key_concepts && Array.isArray(raw.key_concepts)) {
      for (const concept of raw.key_concepts) {
        const heading = concept.name ?? concept.title ?? concept.concept ?? 'Concept'
        const body = [
          concept.description ?? concept.summary ?? '',
          concept.example ? `**Example:** ${concept.example}` : '',
          concept.when_to_use ? `**When to use:** ${concept.when_to_use}` : '',
        ].filter(Boolean).join('\n\n')
        sections.push({ heading, body })
      }
    }
    if (raw.sections && Array.isArray(raw.sections)) {
      for (const s of raw.sections) {
        sections.push({ heading: s.title ?? s.heading ?? '', body: s.content ?? s.body ?? '' })
      }
    }
    if (raw.interview_tips) {
      const tips = Array.isArray(raw.interview_tips) ? raw.interview_tips.join('\n- ') : raw.interview_tips
      sections.push({ heading: 'Interview Tips', body: `- ${tips}` })
    }

    if (sections.length === 0) {
      // Fallback: dump all string values
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'string' && v.length > 10) {
          sections.push({ heading: k.replace(/_/g, ' '), body: v })
        }
      }
    }

    return { title, sections }
  }

  // Markdown — split into sections by ##
  const content = fs.readFileSync(filepath, 'utf-8')
  const rawSections = content.split(/^##\s+/m).filter(Boolean)
  const sections = rawSections.map((s) => {
    const lines = s.split('\n')
    return { heading: lines[0].trim(), body: lines.slice(1).join('\n').trim() }
  })

  return { title, sections }
}

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const module_ = loadModuleContent(id)
  if (!module_) notFound()

  const moduleIds = Object.keys(MODULE_FILES)
  const currentIdx = moduleIds.indexOf(id)
  const prevId = currentIdx > 0 ? moduleIds[currentIdx - 1] : null
  const nextId = currentIdx < moduleIds.length - 1 ? moduleIds[currentIdx + 1] : null

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
            <span>🧭</span> PMPathfinder
          </Link>
          <Link href="/modules" className="text-sm text-gray-400 hover:text-white transition-colors">← All Modules</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-white mb-8">{module_.title}</h1>

        <div className="space-y-8">
          {module_.sections.map((s, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              {s.heading && (
                <h2 className="text-lg font-semibold text-white mb-3">{s.heading}</h2>
              )}
              <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{s.body}</div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-10">
          {prevId ? (
            <Link href={`/modules/${prevId}`} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              ← {MODULE_TITLES[prevId]}
            </Link>
          ) : <div />}
          {nextId ? (
            <Link href={`/modules/${nextId}`} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              {MODULE_TITLES[nextId]} →
            </Link>
          ) : (
            <Link href="/practice" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors">
              Start Practice →
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
