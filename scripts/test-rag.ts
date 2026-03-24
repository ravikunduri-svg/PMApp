/**
 * test-rag.ts — quick end-to-end RAG smoke test
 * Run: npx tsx scripts/test-rag.ts
 */

import path from 'path'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { pipeline, env } from '@xenova/transformers'

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local')
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const QUERY = 'What is the difference between frontend and backend?'

async function main() {
  console.log('\n🔍  RAG Smoke Test')
  console.log('==================')

  // 1. Count chunks in DB
  const { count } = await supabase
    .from('knowledge_chunks')
    .select('id', { count: 'exact', head: true })
  console.log(`\n📦  Chunks in DB: ${count}`)

  // 2. Embed the query locally
  console.log(`\n❓  Query: "${QUERY}"`)
  console.log('   Embedding query...')
  env.cacheDir = path.join(process.cwd(), '.cache', 'xenova')
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  const output = await embedder(QUERY, { pooling: 'mean', normalize: true })
  const queryEmbedding = Array.from(output.data as Float32Array)
  console.log(`   Embedding dims: ${queryEmbedding.length}`)

  // 3. Vector search
  console.log('\n🔎  Searching Supabase...')
  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.3,   // lower threshold for smoke test
    match_count: 3,
  })

  if (error) {
    console.error('\n❌  Search failed:', error.message)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log('\n⚠️   No results above threshold. Try lowering match_threshold.')
    process.exit(0)
  }

  console.log(`\n✅  ${data.length} result(s) returned:\n`)
  for (const row of data) {
    console.log(`   [${(row.similarity * 100).toFixed(1)}%] Ch.${row.chapter_num} — ${row.chapter_title}`)
    console.log(`          pp.${row.page_start}–${row.page_end}`)
    console.log(`          "${row.content.slice(0, 120).replace(/\n/g, ' ')}..."`)
    console.log()
  }
}

main().catch(err => {
  console.error('\n❌  Test failed:', err.message ?? err)
  process.exit(1)
})
