/**
 * ingest-bible.ts
 *
 * One-time script: extract The Builder's Bible PDF → chunk by chapter →
 * embed with @xenova/transformers (local, free) → store in Supabase pgvector.
 *
 * Run:
 *   npx tsx scripts/ingest-bible.ts
 *
 * Prerequisites:
 *   1. Run supabase/migrations/001_knowledge_chunks.sql in Supabase SQL Editor
 *      (uses vector(384) — all-MiniLM-L6-v2 output dims)
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { pipeline, env } from '@xenova/transformers'
import { createRequire } from 'module'
const _require = createRequire(import.meta.url)
// pdf-parse v1 is CJS; suppress the font-private-use-area warnings it spews to stderr
const _origStderrWrite = process.stderr.write.bind(process.stderr)
process.stderr.write = ((chunk: unknown, ...args: unknown[]) => {
  if (typeof chunk === 'string' && chunk.includes('font private use area')) return true
  return (_origStderrWrite as (...a: unknown[]) => boolean)(chunk, ...args)
}) as typeof process.stderr.write
const pdfParse = _require('pdf-parse') as (
  buf: Buffer,
  opts?: object
) => Promise<{ numpages: number; text: string }>
import { CHAPTERS, getChapterForPage } from './chapter-map'

// ── 1. Load .env.local ────────────────────────────────────────────────────────

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌  .env.local not found. Run this script from the pmpath-app directory.')
    process.exit(1)
  }
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const PDF_PATH = path.resolve(
  process.env.BIBLE_PDF_PATH ?? 'C:/Users/kk625158/Downloads/AIPM/The-Builders-Bible.pdf'
)

// ── 2. Validate environment ───────────────────────────────────────────────────

function validate() {
  const missing: string[] = []
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!SUPABASE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    console.error('\n❌  Missing environment variables:')
    for (const v of missing) console.error(`   • ${v}`)
    console.error('\nAdd these to pmpath-app/.env.local and re-run.\n')
    process.exit(1)
  }

  if (!fs.existsSync(PDF_PATH)) {
    console.error(`\n❌  PDF not found at: ${PDF_PATH}`)
    console.error('   Set BIBLE_PDF_PATH=<path> in .env.local to override.\n')
    process.exit(1)
  }
}

validate()

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Cache the pipeline so it loads once
let _embedder: Awaited<ReturnType<typeof pipeline>> | null = null
async function getEmbedder() {
  if (!_embedder) {
    env.cacheDir = path.join(process.cwd(), '.cache', 'xenova')
    _embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }
  return _embedder
}

// ── 3. Text cleaning ──────────────────────────────────────────────────────────

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove standalone page numbers (line with only digits, maybe padded)
    .replace(/^\s*\d{1,4}\s*$/gm, '')
    // Collapse 3+ newlines to 2
    .replace(/\n{3,}/g, '\n\n')
    // Fix hyphenated line breaks (word-\nword → word word)
    .replace(/(\w)-\n(\w)/g, '$1$2')
    // Replace non-ASCII lookalikes
    .replace(/[^\x00-\x7F]/g, (c) => {
      const map: Record<string, string> = {
        '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"',
        '\u2013': '-', '\u2014': '--', '\u2026': '...', '\u00A0': ' ',
      }
      return map[c] ?? ' '
    })
    .trim()
}

// ── 4. Chunking ───────────────────────────────────────────────────────────────

const MAX_PAGES          = 100    // limit ingestion to first N pages
const CHUNK_TARGET_CHARS = 3200   // ~800 tokens at 4 chars/token
const CHUNK_MIN_CHARS    = 400    // don't store tiny fragments

type Chunk = {
  content:       string
  part:          string
  chapter_num:   string
  chapter_title: string
  page_start:    number
  page_end:      number
}

function buildChunks(pageTexts: Map<number, string>): Chunk[] {
  const chunks: Chunk[] = []

  // Group pages by chapter
  const chapterPages = new Map<string, { chapter: ReturnType<typeof getChapterForPage>, pages: { num: number; text: string }[] }>()

  for (const [pageNum, text] of pageTexts) {
    const chapter = getChapterForPage(pageNum)
    if (!chapter) continue
    const key = chapter.num
    if (!chapterPages.has(key)) chapterPages.set(key, { chapter, pages: [] })
    chapterPages.get(key)!.pages.push({ num: pageNum, text })
  }

  // Chunk within each chapter
  for (const { chapter, pages } of chapterPages.values()) {
    if (!chapter) continue

    // Sort pages by number
    pages.sort((a, b) => a.num - b.num)

    let buffer = ''
    let chunkPageStart = pages[0]?.num ?? chapter.start

    for (const { num: pageNum, text } of pages) {
      buffer += (buffer ? '\n\n' : '') + text

      if (buffer.length >= CHUNK_TARGET_CHARS) {
        // Flush: split at the last paragraph boundary within buffer
        const splitAt = buffer.lastIndexOf('\n\n', CHUNK_TARGET_CHARS)
        const content  = splitAt > CHUNK_MIN_CHARS ? buffer.slice(0, splitAt).trim() : buffer.trim()
        const overflow = splitAt > CHUNK_MIN_CHARS ? buffer.slice(splitAt).trim() : ''

        if (content.length >= CHUNK_MIN_CHARS) {
          chunks.push({
            content,
            part:          chapter.part,
            chapter_num:   chapter.num,
            chapter_title: chapter.title,
            page_start:    chunkPageStart,
            page_end:      pageNum,
          })
        }

        buffer         = overflow
        chunkPageStart = pageNum
      }
    }

    // Flush remaining buffer
    if (buffer.trim().length >= CHUNK_MIN_CHARS) {
      chunks.push({
        content:       buffer.trim(),
        part:          chapter.part,
        chapter_num:   chapter.num,
        chapter_title: chapter.title,
        page_start:    chunkPageStart,
        page_end:      pages[pages.length - 1]?.num ?? chapter.end,
      })
    }
  }

  return chunks
}

// ── 5. Embedding ──────────────────────────────────────────────────────────────

const EMBED_BATCH = 16    // keep memory manageable for local inference
const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2'  // 384 dims, runs locally
const EMBED_DIMS  = 384

async function embedBatch(texts: string[]): Promise<number[][]> {
  const embedder = await getEmbedder()
  const results: number[][] = []
  for (const text of texts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output = await (embedder as any)(text, { pooling: 'mean', normalize: true })
    results.push(Array.from(output.data as Float32Array))
  }
  return results
}

// ── 6. Supabase insert ────────────────────────────────────────────────────────

async function checkTableExists(): Promise<boolean> {
  const { error } = await supabase
    .from('knowledge_chunks')
    .select('id')
    .limit(1)
  // If table doesn't exist, error code is 42P01
  return !error || error.code !== '42P01'
}

async function alreadyIngested(): Promise<number> {
  const { count } = await supabase
    .from('knowledge_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'builders-bible')
  return count ?? 0
}

type ChunkRow = {
  source:        string
  part:          string | undefined
  chapter_num:   string | undefined
  chapter_title: string | undefined
  page_start:    number | undefined
  page_end:      number | undefined
  content:       string
  embedding:     number[]
  token_count:   number
}

async function insertChunks(rows: ChunkRow[]): Promise<void> {
  const { error } = await supabase.from('knowledge_chunks').insert(rows)
  if (error) throw new Error(`Supabase insert failed: ${error.message}`)
}

// ── 7. Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📖  The Builder\'s Bible — RAG Ingestion')
  console.log('=========================================')

  // Pre-flight: table check
  const tableOk = await checkTableExists()
  if (!tableOk) {
    console.error('\n❌  Table "knowledge_chunks" not found in Supabase.')
    console.error('   Run this SQL first in Supabase Dashboard → SQL Editor:')
    console.error('   supabase/migrations/001_knowledge_chunks.sql\n')
    process.exit(1)
  }

  // Pre-flight: idempotency check
  const existing = await alreadyIngested()
  if (existing > 0) {
    console.log(`\n⚠️   Already ingested: ${existing} chunks found for source='builders-bible'.`)
    if (process.argv.includes('--force')) {
      console.log('   --force flag detected, deleting existing rows and re-ingesting...')
      await supabase.from('knowledge_chunks').delete().eq('source', 'builders-bible')
      console.log('   Deleted.')
    } else {
      console.log('   Skipping. Pass --force to re-ingest.\n')
      process.exit(0)
    }
  }

  // Step 1: Parse PDF (limited to MAX_PAGES)
  console.log(`\n📄  Parsing PDF: ${PDF_PATH}`)
  console.log(`   Page limit: first ${MAX_PAGES} pages`)
  const pdfBuffer = fs.readFileSync(PDF_PATH)

  // pdf-parse gives us the full text — we need per-page text.
  // Re-parse with a custom render function that tracks page boundaries.
  const pageTexts = new Map<number, string>()
  let currentPage = 0

  const pdfWithPages = await pdfParse(pdfBuffer, {
    max: MAX_PAGES,
    pagerender: (pageData: { pageIndex: number; getTextContent: () => Promise<{ items: Array<{ str: string; hasEOL?: boolean }> }> }) => {
      currentPage = pageData.pageIndex + 1  // 1-indexed
      return pageData.getTextContent().then((textContent) => {
        const items = textContent.items as Array<{ str: string; hasEOL?: boolean }>
        let text = ''
        for (const item of items) {
          text += item.str
          if (item.hasEOL) text += '\n'
        }
        const cleaned = cleanText(text)
        if (cleaned.length > 50) pageTexts.set(currentPage, cleaned)
        return cleaned
      })
    },
  })

  const totalPages = pdfWithPages.numpages
  console.log(`   Total pages in PDF: ${totalPages} (processing first ${MAX_PAGES})`)
  console.log(`   Extracted ${pageTexts.size} pages with content`)

  // Step 2: Chunk
  console.log('\n✂️   Chunking by chapter...')
  const chunks = buildChunks(pageTexts)
  console.log(`   Produced ${chunks.length} chunks across ${CHAPTERS.length} chapters`)

  // Stats per part
  const partCounts: Record<string, number> = {}
  for (const c of chunks) {
    partCounts[c.part] = (partCounts[c.part] ?? 0) + 1
  }
  for (const [part, count] of Object.entries(partCounts)) {
    console.log(`   ${count.toString().padStart(3)} chunks  ${part}`)
  }

  // Token estimate (info only — local embeddings are free)
  const totalChars = chunks.reduce((s, c) => s + c.content.length, 0)
  const estimatedTokens = Math.round(totalChars / 4)
  console.log(`\n💰  Embedding: ~${estimatedTokens.toLocaleString()} tokens — local model, $0.00`)

  // Step 3: Embed in batches (local inference — first run downloads ~33MB model)
  console.log(`\n🔢  Embedding ${chunks.length} chunks locally (${EMBED_MODEL})...`)
  console.log('   (First run: ~33MB model download. Subsequent runs use cache.)')
  const allEmbeddings: number[][] = []
  const totalBatches = Math.ceil(chunks.length / EMBED_BATCH)

  for (let b = 0; b < totalBatches; b++) {
    const batchStart = b * EMBED_BATCH
    const batchEnd   = Math.min(batchStart + EMBED_BATCH, chunks.length)
    const texts      = chunks.slice(batchStart, batchEnd).map(c => c.content)

    process.stdout.write(`   Batch ${b + 1}/${totalBatches} (chunks ${batchStart + 1}-${batchEnd})... `)

    const embeddings = await embedBatch(texts)
    allEmbeddings.push(...embeddings)

    console.log(`✓ (${embeddings[0].length} dims)`)
  }

  // Step 4: Insert to Supabase in batches of 20
  console.log(`\n💾  Inserting ${chunks.length} rows into Supabase...`)
  const INSERT_BATCH = 20
  const insertBatches = Math.ceil(chunks.length / INSERT_BATCH)

  for (let b = 0; b < insertBatches; b++) {
    const start = b * INSERT_BATCH
    const end   = Math.min(start + INSERT_BATCH, chunks.length)
    const rows: ChunkRow[] = chunks.slice(start, end).map((chunk, i) => ({
      source:        'builders-bible',
      part:          chunk.part,
      chapter_num:   chunk.chapter_num,
      chapter_title: chunk.chapter_title,
      page_start:    chunk.page_start,
      page_end:      chunk.page_end,
      content:       chunk.content,
      embedding:     allEmbeddings[start + i],
      token_count:   Math.round(chunk.content.length / 4),
    }))

    process.stdout.write(`   Insert batch ${b + 1}/${insertBatches}... `)
    await insertChunks(rows)
    console.log('✓')
  }

  // Step 5: Verify
  const finalCount = await alreadyIngested()
  console.log(`\n✅  Done! ${finalCount} chunks stored in knowledge_chunks.`)
  console.log(`   Source:  builders-bible`)
  console.log(`   Model:   ${EMBED_MODEL} (${EMBED_DIMS} dims)`)
  console.log(`   Cost:    $0.00 (local inference)`)
  console.log('\n🚀  Next step: run the retrieval API and wire it into scoreAnswer()\n')

}

main().catch((err) => {
  console.error('\n❌  Ingestion failed:', err.message ?? err)
  process.exit(1)
})
