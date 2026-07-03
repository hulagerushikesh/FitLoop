-- FitLoop database schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`) on a fresh project.
--
-- Design notes:
--   * `profiles` extends Supabase's built-in `auth.users` (the spec's "users" table) —
--     this is the standard Supabase pattern, since you can't add arbitrary columns to
--     auth.users directly. A trigger auto-creates a profile row on signup.
--   * Every table has RLS enabled. Users can only read/write their own rows.
--   * `exercises` and `food_items` support `user_id IS NULL` rows, which represent a
--     shared library (seeded exercises, USDA/Open Food Facts cache) readable by everyone
--     but not writable by users.
--   * Tables only needed by later modules (e.g. a workout_exercises join table for the
--     routine builder) are intentionally left out for now and will be added as
--     migrations when those modules are built, per "build one module at a time."

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================================
-- profiles  (extends auth.users — the spec's "users" table)
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  age integer check (age between 10 and 120),
  sex text check (sex in ('male', 'female', 'other')),
  height_cm numeric check (height_cm between 50 and 272),
  activity_level text check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  goal_type text check (goal_type in ('fat_loss', 'muscle_gain', 'maintenance')),
  target_rate_kg_per_week numeric check (target_rate_kg_per_week between -1.5 and 1.5),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at current on profile edits.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- body_metrics  (weight / body-fat log over time)
-- ============================================================================
create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  weight_kg numeric not null check (weight_kg > 0),
  body_fat_pct numeric check (body_fat_pct between 0 and 100),
  recorded_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, recorded_at)
);

alter table public.body_metrics enable row level security;

create policy "Users manage own body metrics" on public.body_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- goals  (calorie/macro targets over time — history is kept for transparency)
-- ============================================================================
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  calorie_target integer not null check (calorie_target > 0),
  protein_g numeric not null check (protein_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  carbs_g numeric not null check (carbs_g >= 0),
  reason text,
  effective_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "Users manage own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- exercises  (shared library + user custom exercises)
-- ============================================================================
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  name text not null,
  muscle_group text not null check (
    muscle_group in ('chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body', 'cardio')
  ),
  equipment text,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "Everyone can view library and own exercises" on public.exercises
  for select using (user_id is null or auth.uid() = user_id);
create policy "Users manage own custom exercises" on public.exercises
  for insert with check (auth.uid() = user_id);
create policy "Users update own custom exercises" on public.exercises
  for update using (auth.uid() = user_id);
create policy "Users delete own custom exercises" on public.exercises
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- workouts  (user-defined routines, e.g. "Push Day")
-- ============================================================================
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  day_of_week integer check (day_of_week between 0 and 6),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.workouts enable row level security;

create policy "Users manage own workouts" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- workout_logs  (actual logged sets per session)
-- ============================================================================
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workout_id uuid references public.workouts (id) on delete set null,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  set_number integer not null check (set_number > 0),
  weight_kg numeric check (weight_kg >= 0),
  reps integer check (reps >= 0),
  rpe numeric check (rpe between 1 and 10),
  logged_at timestamptz not null default now()
);

alter table public.workout_logs enable row level security;

create policy "Users manage own workout logs" on public.workout_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index workout_logs_user_exercise_idx
  on public.workout_logs (user_id, exercise_id, logged_at desc);

-- ============================================================================
-- food_items  (USDA / Open Food Facts cache + user custom foods)
-- ============================================================================
create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  source text not null default 'custom' check (source in ('usda', 'off', 'custom')),
  user_id uuid references public.profiles (id) on delete cascade,
  name text not null,
  brand text,
  serving_size numeric not null default 100 check (serving_size > 0),
  serving_unit text not null default 'g',
  calories numeric not null check (calories >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  created_at timestamptz not null default now()
);

alter table public.food_items enable row level security;

create policy "Everyone can view library and own food items" on public.food_items
  for select using (user_id is null or auth.uid() = user_id);
create policy "Users manage own food items" on public.food_items
  for insert with check (auth.uid() = user_id);
create policy "Users update own food items" on public.food_items
  for update using (auth.uid() = user_id);
create policy "Users delete own food items" on public.food_items
  for delete using (auth.uid() = user_id);

create index food_items_name_idx on public.food_items using gin (to_tsvector('english', name));

-- ============================================================================
-- meals  (user-saved, reusable meal presets)
-- ============================================================================
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  calories numeric not null default 0 check (calories >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  created_at timestamptz not null default now()
);

alter table public.meals enable row level security;

create policy "Users manage own meals" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- food_logs  (daily food log entries)
-- ============================================================================
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  food_item_id uuid references public.food_items (id) on delete restrict,
  meal_id uuid references public.meals (id) on delete set null,
  name text not null,
  servings numeric not null default 1 check (servings > 0),
  calories numeric not null check (calories >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  meal_type text not null default 'snack' check (
    meal_type in ('breakfast', 'lunch', 'dinner', 'snack')
  ),
  logged_at timestamptz not null default now(),
  logged_date date not null default current_date
);

alter table public.food_logs enable row level security;

create policy "Users manage own food logs" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index food_logs_user_date_idx on public.food_logs (user_id, logged_date);
