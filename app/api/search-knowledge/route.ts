import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/search-knowledge — browse all chunks paginated
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  const { data, count, error } = await supabase
    .from('knowledge_chunks')
    .select('id, part, chapter_num, chapter_title, page_start, page_end, content, token_count', { count: 'exact' })
    .order('page_start', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ chunks: data, total: count, page, limit })
}

// POST /api/search-knowledge — full-text keyword search (works in Vercel serverless)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const query = body?.query?.trim()
  if (!query || query.length < 3) {
    return NextResponse.json({ error: 'query must be at least 3 characters' }, { status: 400 })
  }

  // Use PostgreSQL full-text search via the GIN index on content
  const { data, error } = await supabase
    .from('knowledge_chunks')
    .select('id, part, chapter_num, chapter_title, page_start, page_end, content, token_count')
    .textSearch('content', query, { type: 'websearch', config: 'english' })
    .order('page_start', { ascending: true })
    .limit(5)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ results: data ?? [], mode: 'fulltext' })
}
