-- FitLoop schema v7 — analytics & progress:
--   * body_measurements (waist/chest/arms/… over time)
--   * progress_photos (private bucket + table)
--   * achievements (badges)
--
-- Run in the Supabase SQL Editor after 0006. Safe to re-run.

-- ============================================================================
-- body_measurements: one value per metric per day.
-- ============================================================================
create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  metric_type text not null check (
    metric_type in ('waist', 'chest', 'arms', 'thighs', 'hips', 'calves', 'neck', 'shoulders')
  ),
  value_cm numeric not null check (value_cm > 0 and value_cm < 300),
  recorded_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, metric_type, recorded_at)
);

alter table public.body_measurements enable row level security;

drop policy if exists "Users manage own measurements" on public.body_measurements;
create policy "Users manage own measurements" on public.body_measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists body_measurements_user_idx
  on public.body_measurements (user_id, metric_type, recorded_at desc);

-- ============================================================================
-- progress_photos: private per user.
-- ============================================================================
create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  taken_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.progress_photos enable row level security;

drop policy if exists "Users manage own progress photos" on public.progress_photos;
create policy "Users manage own progress photos" on public.progress_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

drop policy if exists "Users read own progress photos" on storage.objects;
create policy "Users read own progress photos" on storage.objects
  for select using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users upload own progress photos" on storage.objects;
create policy "Users upload own progress photos" on storage.objects
  for insert with check (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete own progress photos" on storage.objects;
create policy "Users delete own progress photos" on storage.objects
  for delete using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- achievements: unlocked badge keys per user (catalog lives in the app).
-- ============================================================================
create table if not exists public.achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  key text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.achievements enable row level security;

drop policy if exists "Users manage own achievements" on public.achievements;
create policy "Users manage own achievements" on public.achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
