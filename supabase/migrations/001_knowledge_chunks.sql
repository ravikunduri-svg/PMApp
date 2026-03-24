-- Run this in your Supabase SQL Editor before running the ingestion script.
-- Dashboard → SQL Editor → New Query → paste → Run
--
-- Embedding model: Xenova/all-MiniLM-L6-v2 (local, free) → 384 dims

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop old table if it exists with wrong dims (safe to re-run)
DROP TABLE IF EXISTS public.knowledge_chunks;

-- 3. Create the knowledge chunks table
CREATE TABLE public.knowledge_chunks (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text        NOT NULL DEFAULT 'builders-bible',
  part          text,
  chapter_num   text,
  chapter_title text,
  page_start    integer,
  page_end      integer,
  content       text        NOT NULL,
  embedding     vector(384),
  token_count   integer,
  created_at    timestamptz DEFAULT now()
);

-- 4. HNSW index for fast cosine similarity search
CREATE INDEX knowledge_chunks_embedding_idx
  ON public.knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 5. Full-text search index (fallback for keyword queries)
CREATE INDEX knowledge_chunks_fts_idx
  ON public.knowledge_chunks
  USING gin(to_tsvector('english', content));

-- 6. Match function used by the retrieval API
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.70,
  match_count     int   DEFAULT 5
)
RETURNS TABLE (
  id            uuid,
  source        text,
  part          text,
  chapter_num   text,
  chapter_title text,
  page_start    integer,
  page_end      integer,
  content       text,
  similarity    float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id, source, part, chapter_num, chapter_title,
    page_start, page_end, content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
