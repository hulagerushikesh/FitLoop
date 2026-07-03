-- FitLoop schema v3 — dedicated "forearms" muscle group (for a real
-- Shoulders+Forearms training day) and exercise instructions text, used
-- by the new exercise detail screen. Paste into the SQL Editor and run
-- once, same workflow as schema.sql / 0002. Idempotent.

-- Postgres auto-names the original inline check constraint
-- "exercises_muscle_group_check" (table_column_check convention).
alter table public.exercises drop constraint if exists exercises_muscle_group_check;
alter table public.exercises add constraint exercises_muscle_group_check
  check (muscle_group in ('chest', 'back', 'legs', 'shoulders', 'arms', 'forearms', 'core', 'full_body', 'cardio'));

alter table public.exercises add column if not exists instructions text;
