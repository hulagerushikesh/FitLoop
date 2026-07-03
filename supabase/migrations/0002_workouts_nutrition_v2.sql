-- FitLoop schema v2 — workout ordering/sessions, calorie burn, AI-logged
-- food entries, and a daily_summary view for the calendar.
--
-- This is meant to be pasted into the Supabase SQL Editor and run once,
-- the same way schema.sql was — it is NOT tracked via `supabase db push`
-- migration history, since schema.sql was already applied manually.
-- All statements are written to be safe to re-run (IF NOT EXISTS / OR REPLACE).

-- ============================================================================
-- exercises: movement pattern + display ordering + MET value for calorie burn
-- ============================================================================
alter table public.exercises
  add column if not exists category text check (category in ('compound', 'isolation', 'cardio')),
  add column if not exists sort_order integer not null default 100,
  add column if not exists met_value numeric check (met_value > 0);

-- Lets the exercise seed be safely re-run (ON CONFLICT target for library rows).
create unique index if not exists exercises_library_name_idx
  on public.exercises (name) where user_id is null;

-- ============================================================================
-- workouts: tag routines with a split type so we can order/group them (PPL etc.)
-- ============================================================================
alter table public.workouts
  add column if not exists split_type text check (
    split_type in ('push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'custom')
  );

-- ============================================================================
-- workout_exercises: which exercises belong to a routine, and in what order
-- ============================================================================
create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  order_index integer not null default 0,
  target_sets integer not null default 3 check (target_sets > 0),
  target_reps integer check (target_reps > 0),
  created_at timestamptz not null default now(),
  unique (workout_id, exercise_id)
);

alter table public.workout_exercises enable row level security;

drop policy if exists "Users manage own workout exercises" on public.workout_exercises;
create policy "Users manage own workout exercises" on public.workout_exercises
  for all using (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  );

create index if not exists workout_exercises_workout_idx
  on public.workout_exercises (workout_id, order_index);

-- ============================================================================
-- workout_sessions: one row per "I did a workout today" — groups sets logged
-- in workout_logs and holds the estimated calorie burn for the calendar.
-- ============================================================================
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workout_id uuid references public.workouts (id) on delete set null,
  name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  calories_burned numeric check (calories_burned >= 0),
  session_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;

drop policy if exists "Users manage own workout sessions" on public.workout_sessions;
create policy "Users manage own workout sessions" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists workout_sessions_user_date_idx
  on public.workout_sessions (user_id, session_date);

-- ============================================================================
-- workout_logs: tie individual logged sets to a session
-- ============================================================================
alter table public.workout_logs
  add column if not exists session_id uuid references public.workout_sessions (id) on delete cascade;

create index if not exists workout_logs_session_idx on public.workout_logs (session_id);

-- ============================================================================
-- food_logs: track how an entry was logged (manual / picked from search /
-- AI photo / AI text) for transparency in the log and calendar.
-- ============================================================================
alter table public.food_logs
  add column if not exists source text not null default 'manual' check (
    source in ('manual', 'food_item', 'ai_photo', 'ai_text')
  );

-- ============================================================================
-- daily_summary: per-user, per-day totals for the Calendar screen.
-- security_invoker makes the view respect the querying user's RLS on the
-- underlying tables (Postgres 15+), instead of running as the view owner.
-- ============================================================================
create or replace view public.daily_summary
with (security_invoker = true) as
select
  coalesce(f.user_id, w.user_id) as user_id,
  coalesce(f.day, w.day) as day,
  coalesce(f.calories_consumed, 0) as calories_consumed,
  coalesce(f.protein_g, 0) as protein_g,
  coalesce(f.carbs_g, 0) as carbs_g,
  coalesce(f.fat_g, 0) as fat_g,
  coalesce(w.calories_burned, 0) as calories_burned,
  coalesce(w.workout_count, 0) as workout_count
from
  (
    select
      user_id,
      logged_date as day,
      sum(calories) as calories_consumed,
      sum(protein_g) as protein_g,
      sum(carbs_g) as carbs_g,
      sum(fat_g) as fat_g
    from public.food_logs
    group by user_id, logged_date
  ) f
full outer join
  (
    select
      user_id,
      session_date as day,
      sum(coalesce(calories_burned, 0)) as calories_burned,
      count(*) as workout_count 
    from public.workout_sessions
    group by user_id, session_date
  ) w
  on f.user_id = w.user_id and f.day = w.day;
