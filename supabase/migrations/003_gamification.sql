ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_total          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level             integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS badges_earned     jsonb   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS modules_completed jsonb   NOT NULL DEFAULT '[]';
