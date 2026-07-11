-- FitLoop schema v11 — unified voice logging.
--
-- Voice logs of a cardio/freeform ACTIVITY (e.g. "I ran for 25 minutes") are
-- stored as standalone workout_sessions with no linked routine. These two
-- nullable columns flag such a row so the calendar and analytics can tell an
-- activity apart from a lifted routine. Strength workouts logged by voice reuse
-- the existing session + workout_logs path and leave these null.
--
-- Additive and safe to re-run. RLS on workout_sessions already scopes every row
-- to auth.uid() = user_id (migration 0002), so these columns inherit it — no
-- new policy needed.

alter table public.workout_sessions
  add column if not exists activity_name text;

alter table public.workout_sessions
  add column if not exists activity_type text;
