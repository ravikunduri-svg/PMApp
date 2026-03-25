import { notFound, redirect } from 'next/navigation'
import fs from 'fs'
import path from 'path'
import { createServerSupabaseClient, adminClient } from '@/lib/supabase-server'
import ModuleReader, { type ModuleData } from '@/app/components/ModuleReader'

const DATA_DIR = path.join(process.cwd(), 'data')

const MODULE_FILES: Record<string, string> = {
  'f1-pm-roles':    'module-f1-pm-roles.md',
  'f2-pm-journey':  'module-f2-pm-journey.json',
  'f3-frameworks':  'module-f3-frameworks.json',
  'f4-product-sense': 'module-f4-product-sense.json',
  'f5-metrics':     'module-f5-metrics.json',
}

const MODULE_TITLES: Record<string, string> = {
  'f1-pm-roles':      'PM Roles & Archetypes',
  'f2-pm-journey':    'The PM Journey',
  'f3-frameworks':    'Product Frameworks',
  'f4-product-sense': 'Product Sense',
  'f5-metrics':       'Metrics & Prioritization',
}

// ── Load full module data ─────────────────────────────────────────────────────
function loadModuleData(id: string): Omit<ModuleData, 'prevId' | 'nextId' | 'prevTitle' | 'nextTitle' | 'initialCompleted' | 'id'> | null {
  const filename = MODULE_FILES[id]
  if (!filename) return null

  const filepath = path.join(DATA_DIR, filename)
  if (!fs.existsSync(filepath)) return null

  const title = MODULE_TITLES[id]

  if (filename.endsWith('.json')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = JSON.parse(fs.readFileSync(filepath, 'utf-8')) as Record<string, any>

    // Normalize sections (handle varied JSON shapes)
    const sections: { heading: string; body: string }[] = []

    if (raw.overview)     sections.push({ heading: 'Overview',     body: raw.overview })
    if (raw.introduction) sections.push({ heading: 'Introduction', body: raw.introduction })

    if (Array.isArray(raw.key_concepts)) {
      for (const c of raw.key_concepts) {
        const heading = c.name ?? c.title ?? c.concept ?? 'Concept'
        const body = [
          c.description ?? c.summary ?? '',
          c.example       ? `**Example:** ${c.example}` : '',
          c.when_to_use   ? `**When to use:** ${c.when_to_use}` : '',
        ].filter(Boolean).join('\n\n')
        sections.push({ heading, body })
      }
    }

    if (Array.isArray(raw.sections)) {
      for (const s of raw.sections) {
        sections.push({ heading: s.title ?? s.heading ?? '', body: s.content ?? s.body ?? '' })
      }
    }

    if (raw.interview_tips) {
      const tips = Array.isArray(raw.interview_tips) ? raw.interview_tips.join('\n- ') : raw.interview_tips
      sections.push({ heading: 'Interview Tips', body: `- ${tips}` })
    }

    if (sections.length === 0) {
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'string' && v.length > 10) {
          sections.push({ heading: k.replace(/_/g, ' '), body: v })
        }
      }
    }

    // Extract rich fields
    const learningObjectives: string[] = Array.isArray(raw.learning_objectives) ? raw.learning_objectives : []

    const workedExamples = Array.isArray(raw.worked_examples)
      ? raw.worked_examples.map((e: Record<string, string>) => ({
          title:          e.title ?? '',
          scenario:       e.scenario ?? '',
          weak_approach:  e.weak_approach ?? '',
          strong_approach: e.strong_approach ?? '',
          key_insight:    e.key_insight ?? '',
        }))
      : []

    const keyTakeaways = Array.isArray(raw.key_takeaways)
      ? raw.key_takeaways.map((t: Record<string, unknown>) => ({
          text:               (t.text as string) ?? '',
          related_dimensions: Array.isArray(t.related_dimensions) ? t.related_dimensions as string[] : [],
        }))
      : []

    const resources = Array.isArray(raw.resources)
      ? raw.resources.map((r: Record<string, string>) => ({
          title:       r.title ?? '',
          url:         r.url ?? '',
          type:        r.type ?? 'article',
          description: r.description ?? '',
        }))
      : []

    const estimatedMinutes: number | null =
      raw.estimated_duration_minutes ?? raw.estimated_minutes ?? null

    return { title, sections, learningObjectives, workedExamples, keyTakeaways, resources, estimatedMinutes, description: raw.description }
  }

  // Markdown module (f1) — split by ##
  const content = fs.readFileSync(filepath, 'utf-8')
  const rawSections = content.split(/^##\s+/m).filter(Boolean)
  const sections = rawSections.map((s) => {
    const lines = s.split('\n')
    return { heading: lines[0].trim(), body: lines.slice(1).join('\n').trim() }
  })

  return { title, sections, description: undefined }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/auth/login')

  const moduleData = loadModuleData(id)
  if (!moduleData) notFound()

  const { data: profile } = await adminClient
    .from('profiles')
    .select('modules_completed')
    .eq('id', user.id)
    .maybeSingle()

  const modulesCompleted: string[] = (profile?.modules_completed as string[]) ?? []
  const isCompleted = modulesCompleted.includes(id)

  const moduleIds = Object.keys(MODULE_FILES)
  const currentIdx = moduleIds.indexOf(id)
  const prevId    = currentIdx > 0 ? moduleIds[currentIdx - 1] : null
  const nextId    = currentIdx < moduleIds.length - 1 ? moduleIds[currentIdx + 1] : null

  const data: ModuleData = {
    id,
    ...moduleData,
    prevId,
    nextId,
    prevTitle: prevId ? MODULE_TITLES[prevId] : null,
    nextTitle: nextId ? MODULE_TITLES[nextId] : null,
    initialCompleted: isCompleted,
  }

  return <ModuleReader data={data} />
}
