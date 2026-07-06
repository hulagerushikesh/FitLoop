-- FitLoop schema v6 — nutrition depth:
--   * water_logs + daily_summary water totals
--   * food_items cache upsert support (unique external id per source)
--   * meal photos kept for AI-logged entries (bucket + food_logs.photo_path)
--   * meal_items: composite "meal builder" meals made of multiple items
--
-- Run in the Supabase SQL Editor after 0005. Safe to re-run.

-- ============================================================================
-- water_logs: quick-add water entries, summed per day.
-- ============================================================================
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  volume_ml integer not null check (volume_ml > 0 and volume_ml <= 5000),
  logged_at timestamptz not null default now(),
  logged_date date not null default current_date
);

alter table public.water_logs enable row level security;

drop policy if exists "Users manage own water logs" on public.water_logs;
create policy "Users manage own water logs" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists water_logs_user_date_idx on public.water_logs (user_id, logged_date);

-- ============================================================================
-- food_items: allow upserting external results (Open Food Facts / USDA)
-- keyed by (source, external_id).
-- ============================================================================
create unique index if not exists food_items_source_external_idx
  on public.food_items (source, external_id)
  where external_id is not null;

-- ============================================================================
-- food_logs: keep the analyzed meal photo (see meal-photos bucket below).
-- ============================================================================
alter table public.food_logs
  add column if not exists photo_path text;

-- ============================================================================
-- meal_items: the contents of a composite meal (meals.* holds the totals).
-- ============================================================================
create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  food_item_id uuid references public.food_items (id) on delete set null,
  name text not null,
  servings numeric not null default 1 check (servings > 0),
  calories numeric not null default 0 check (calories >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  created_at timestamptz not null default now()
);

alter table public.meal_items enable row level security;

drop policy if exists "Users manage own meal items" on public.meal_items;
create policy "Users manage own meal items" on public.meal_items
  for all using (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  );

create index if not exists meal_items_meal_idx on public.meal_items (meal_id);

-- ============================================================================
-- meal-photos bucket: private per user (meal photos can be sensitive) —
-- read/write restricted to the owner's folder; the app uses signed URLs.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', false)
on conflict (id) do nothing;

drop policy if exists "Users read own meal photos" on storage.objects;
create policy "Users read own meal photos" on storage.objects
  for select using (
    bucket_id = 'meal-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users upload own meal photos" on storage.objects;
create policy "Users upload own meal photos" on storage.objects
  for insert with check (
    bucket_id = 'meal-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete own meal photos" on storage.objects;
create policy "Users delete own meal photos" on storage.objects
  for delete using (
    bucket_id = 'meal-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- daily_summary: add water totals (full view replacement, same as 0002).
-- ============================================================================
create or replace view public.daily_summary
with (security_invoker = true) as
select
  coalesce(f.user_id, w.user_id, h.user_id) as user_id,
  coalesce(f.day, w.day, h.day) as day,
  coalesce(f.calories_consumed, 0) as calories_consumed,
  coalesce(f.protein_g, 0) as protein_g,
  coalesce(f.carbs_g, 0) as carbs_g,
  coalesce(f.fat_g, 0) as fat_g,
  coalesce(w.calories_burned, 0) as calories_burned,
  coalesce(w.workout_count, 0) as workout_count,
  coalesce(h.water_ml, 0) as water_ml
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
  on f.user_id = w.user_id and f.day = w.day
full outer join
  (
    select user_id, logged_date as day, sum(volume_ml) as water_ml
    from public.water_logs
    group by user_id, logged_date
  ) h
  on coalesce(f.user_id, w.user_id) = h.user_id and coalesce(f.day, w.day) = h.day;
