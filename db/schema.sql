-- PMPathfinder app schema
-- Run this in Supabase SQL Editor at: https://supabase.com/dashboard/project/nhqpzruofjszeqlurhen/sql

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  archetype text check (archetype in ('consumer', 'b2b', 'technical')),
  initial_dimension_scores jsonb default '{}',
  created_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
create policy "Users can view and edit their own profile"
  on profiles for all using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Practice Sessions ─────────────────────────────────────────────────────────
create table if not exists practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  archetype text,
  status text default 'in_progress' check (status in ('in_progress', 'scoring', 'complete', 'error')),
  questions jsonb default '[]',        -- array of selected question objects
  answers jsonb default '[]',          -- array of {question_id, answer, answer_type}
  scores jsonb default '{}',           -- {problem_framing: 4, user_empathy: 3, ...}
  question_results jsonb default '[]', -- per-question feedback array
  overall_score numeric,
  attempt_number int default 1,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table practice_sessions enable row level security;
create policy "Users can manage their own sessions"
  on practice_sessions for all using (auth.uid() = user_id);

-- ── Readiness Checks ─────────────────────────────────────────────────────────
create table if not exists readiness_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  jd_text text,
  parsed_role text,
  role_requirements jsonb,   -- {problem_framing: 7, user_empathy: 8, ...}
  user_scores jsonb,         -- weighted average across recent sessions
  gap_analysis jsonb,        -- [{dimension, user_score, required, gap}]
  recommendation text check (recommendation in ('ready', 'almost', 'not_yet')),
  readiness_pct int,
  created_at timestamptz default now()
);

alter table readiness_checks enable row level security;
create policy "Users can manage their own readiness checks"
  on readiness_checks for all using (auth.uid() = user_id);
