-- FitLoop schema v4 — profile settings: unit preference + avatar storage.
--
-- Run in the Supabase SQL Editor, same as schema.sql / 0002 / 0003.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT / drop-and-recreate policies).

-- ============================================================================
-- profiles: display-unit preference and avatar pointer.
-- All stored measurements remain canonical metric (kg / cm) — unit_system
-- only affects presentation and input parsing in the app.
-- ============================================================================
alter table public.profiles
  add column if not exists unit_system text not null default 'metric'
    check (unit_system in ('metric', 'imperial')),
  add column if not exists avatar_path text;

-- ============================================================================
-- avatars storage bucket: public-read, users write only inside their own
-- <user_id>/ folder. Public read is acceptable for avatars (paths contain
-- unguessable user UUIDs and avatars are non-sensitive by design).
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
