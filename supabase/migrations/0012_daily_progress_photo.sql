-- FitLoop schema v12 — daily progress photo.
--
-- Encourages a DAILY progress-photo habit: at most one photo per user per day,
-- so the app can upsert "today's photo" and the calendar can show a clean
-- one-dot-per-day indicator. Reuses the existing progress_photos table and the
-- private progress-photos storage bucket from migration 0007 — no new table or
-- bucket, and RLS/storage policies from 0007 still apply.
--
-- Additive and safe to re-run.

-- Collapse any pre-existing same-day duplicates (keeping the most recently
-- created row) so the unique index below can be created without error.
delete from public.progress_photos p
using public.progress_photos q
where p.user_id = q.user_id
  and p.taken_at = q.taken_at
  and p.created_at < q.created_at;

-- One progress photo per user per day. This is also the conflict target the app
-- upserts against (onConflict: 'user_id,taken_at').
create unique index if not exists progress_photos_user_day_key
  on public.progress_photos (user_id, taken_at);
