'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Chunk = {
  id: string
  part: string
  chapter_num: string
  chapter_title: string
  page_start: number
  page_end: number
  content: string
  token_count: number
  similarity?: number
}

export default function KnowledgePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Chunk[]>([])
  const [allChunks, setAllChunks] = useState<Chunk[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/search-knowledge')
      .then(r => r.json())
      .then(d => { setAllChunks(d.chunks ?? []); setTotal(d.total ?? 0) })
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    const res = await fetch('/api/search-knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const data = await res.json()
    setResults(data.results ?? [])
    setLoading(false)
  }

  const displayChunks = searched ? results : allChunks

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
        <span className="text-sm font-semibold text-purple-400">Builder's Bible — Knowledge Base</span>
        <span className="text-xs text-gray-500">{total} chunks indexed</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask anything — e.g. 'What is RAG?' or 'How does version control work?'"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
          {searched && (
            <button
              type="button"
              onClick={() => { setSearched(false); setResults([]); setQuery('') }}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              Clear
            </button>
          )}
        </form>

        {/* Status line */}
        <div className="text-xs text-gray-500 mb-4">
          {searched
            ? loading ? 'Searching…' : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`
            : `Showing all ${allChunks.length} indexed chunks (pages 1–100)`}
        </div>

        {/* Chunks */}
        <div className="space-y-3">
          {displayChunks.map(chunk => (
            <div
              key={chunk.id}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => setExpanded(expanded === chunk.id ? null : chunk.id)}
                className="w-full flex items-start justify-between px-5 py-4 text-left hover:bg-gray-800/50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded">
                      Ch.{chunk.chapter_num}
                    </span>
                    <span className="text-xs text-gray-500">{chunk.part}</span>
                    {chunk.similarity !== undefined && (
                      <span className="text-xs font-mono bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded">
                        {(chunk.similarity * 100).toFixed(0)}% match
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-white">{chunk.chapter_title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    pp.{chunk.page_start}–{chunk.page_end} · {chunk.token_count} tokens
                  </p>
                </div>
                <span className="text-gray-600 ml-4 mt-1">{expanded === chunk.id ? '▲' : '▼'}</span>
              </button>

              {/* Preview (always visible) */}
              <div className="px-5 pb-3">
                <p className="text-xs text-gray-400 line-clamp-2">
                  {chunk.content.slice(0, 200).replace(/\n/g, ' ')}…
                </p>
              </div>

              {/* Expanded content */}
              {expanded === chunk.id && (
                <div className="px-5 pb-5 border-t border-gray-800 pt-4">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">
                    {chunk.content}
                  </pre>
                </div>
              )}
            </div>
          ))}

          {searched && !loading && results.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No results above similarity threshold. Try a different query.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
