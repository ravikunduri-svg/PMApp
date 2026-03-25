-- Retention features: streak, interview countdown, daily drill
-- Run in Supabase SQL Editor → Dashboard → SQL Editor → New Query → Run

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streak_count       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_last_active date,
  ADD COLUMN IF NOT EXISTS interview_date     date,
  ADD COLUMN IF NOT EXISTS daily_drill_date   date,
  ADD COLUMN IF NOT EXISTS daily_drill_qid    text;
