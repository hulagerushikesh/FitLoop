-- FitLoop schema v5 — workout depth & intelligence:
--   * superset grouping on routine exercises
--   * advanced set types (drop sets, AMRAP/to-failure) on logged sets
--   * muscle_group_fatigue for the recovery model
--   * optional photos on custom exercises
--
-- Run in the Supabase SQL Editor, same as previous migrations.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT / drop-and-recreate policies).

-- ============================================================================
-- workout_exercises: exercises sharing the same non-null superset_group
-- within a routine are performed back-to-back as one superset.
-- ============================================================================
alter table public.workout_exercises
  add column if not exists superset_group integer check (superset_group > 0);

-- ============================================================================
-- workout_logs: how the set was performed.
--   normal  — a standard working set
--   drop    — a drop-set continuation of the previous set (same set_number,
--             lower weight, logged as its own row)
--   failure — AMRAP / taken to failure
-- ============================================================================
alter table public.workout_logs
  add column if not exists set_type text not null default 'normal'
    check (set_type in ('normal', 'drop', 'failure'));

-- ============================================================================
-- muscle_group_fatigue: one row per user per muscle group, refreshed after
-- each completed session. Recovery-hours heuristics live in the app
-- (engine/muscleRecovery.ts) — this stores the observed training facts.
-- ============================================================================
create table if not exists public.muscle_group_fatigue (
  user_id uuid not null references public.profiles (id) on delete cascade,
  muscle_group text not null check (
    muscle_group in ('chest', 'back', 'legs', 'shoulders', 'arms', 'forearms', 'core', 'full_body', 'cardio')
  ),
  last_trained_at timestamptz not null,
  estimated_recovery_hours numeric not null check (estimated_recovery_hours > 0),
  rolling_volume_7d numeric not null default 0 check (rolling_volume_7d >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, muscle_group)
);

alter table public.muscle_group_fatigue enable row level security;

drop policy if exists "Users manage own muscle fatigue" on public.muscle_group_fatigue;
create policy "Users manage own muscle fatigue" on public.muscle_group_fatigue
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- exercises: optional photo for custom exercises + storage bucket.
-- ============================================================================
alter table public.exercises
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public)
values ('exercise-photos', 'exercise-photos', true)
on conflict (id) do nothing;

drop policy if exists "Exercise photos are publicly readable" on storage.objects;
create policy "Exercise photos are publicly readable" on storage.objects
  for select using (bucket_id = 'exercise-photos');

drop policy if exists "Users upload own exercise photos" on storage.objects;
create policy "Users upload own exercise photos" on storage.objects
  for insert with check (
    bucket_id = 'exercise-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete own exercise photos" on storage.objects;
create policy "Users delete own exercise photos" on storage.objects
  for delete using (
    bucket_id = 'exercise-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
