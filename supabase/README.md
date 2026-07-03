# FitLoop — Supabase setup

1. Create a free project at https://supabase.com/dashboard.
2. In the SQL Editor, paste and run `schema.sql` from this folder. It creates
   all tables, RLS policies, and the `profiles` auto-provisioning trigger.
3. In **Authentication > Providers**, email/password is on by default. To add
   Google sign-in later, enable the Google provider and add your OAuth client
   ID/secret there.
4. In **Authentication > URL Configuration**, email confirmation is on by
   default — signup will send a confirmation email before the user can log
   in. You can disable "Confirm email" in **Authentication > Sign In / Providers**
   during development if you want instant login after signup.
5. Copy your project's URL and anon key from **Settings > API**, then in
   `app/`, copy `.env.example` to `.env` and fill them in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

The anon key is safe to ship in the client bundle — access control is
enforced by the RLS policies in `schema.sql`, not by hiding the key.

Your linked project ref is `qedtsattownvjcsqvmyc`, so your URL is
`https://qedtsattownvjcsqvmyc.supabase.co` — grab the anon key from
**Settings > API** to complete `app/.env`.

## Weekly recalibration (Module 3)

`functions/weekly-recalibration/` is a Supabase Edge Function that, for
every onboarded user, compares their actual weight trend against their
goal and inserts an adjusted `goals` row when it drifts — see
`app/src/engine/recalibration.ts` for the (unit-tested) algorithm this
mirrors.

Deploy it with the CLI you already have linked:
```
supabase functions deploy weekly-recalibration
```

Then schedule it to run weekly (e.g. Monday 6am UTC) with `pg_cron` +
`pg_net` — run this in the SQL Editor once `pg_cron` and `pg_net` are
enabled (**Database > Extensions**):
```sql
select cron.schedule(
  'weekly-recalibration',
  '0 6 * * 1',
  $$
  select net.http_post(
    url := 'https://qedtsattownvjcsqvmyc.supabase.co/functions/v1/weekly-recalibration',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  );
  $$
);
```
(Store the service role key as a Vault secret or Postgres setting rather
than pasting it inline — see Supabase's Cron docs for the current
recommended pattern.)

**Note:** I wrote and reviewed this function but couldn't execute it in
this environment (no Deno runtime here) — sanity-check it with
`supabase functions serve weekly-recalibration` locally before relying
on the schedule in production.

## Schema v2 (workouts + nutrition + calendar)

Run `migrations/0002_workouts_nutrition_v2.sql` in the SQL Editor — same
workflow as `schema.sql`. It adds:
- `exercises.category` / `sort_order` / `met_value` — for PPL-style
  ordering and calorie-burn estimation.
- `workouts.split_type`, `workout_exercises` — routine composition
  (which exercises, in what order, target sets/reps).
- `workout_sessions` — one row per logged workout, holding estimated
  calories burned; `workout_logs.session_id` now links sets to a session.
- `food_logs.source` — tags whether an entry was manual, picked from
  search, or AI-estimated from a photo/text description.
- `daily_summary` view — per-day totals (calories in/out, macros,
  workout count) the Calendar screen reads from.

All statements are idempotent (`if not exists` / `or replace`), so it's
safe to re-run.

Then run `seed_exercises.sql` to populate the shared exercise library
(~35 exercises across Push/Pull/Legs/core/cardio, pre-ordered compound-
before-isolation and tagged with MET values). Also idempotent — re-running
it upserts by exercise name.

## AI meal recognition (Gemini)

`functions/analyze-meal/` calls Gemini Flash to estimate calories/macros
from a text description or a photo of a meal.

1. Get a free API key at https://aistudio.google.com/apikey.
2. Set it as a function secret (never put this in `app/.env` — it must
   stay server-side):
   ```
   supabase secrets set GEMINI_API_KEY=your-key-here
   ```
3. Deploy: `supabase functions deploy analyze-meal`

Like `weekly-recalibration`, this was written and reviewed but not
executed here (no Deno runtime) — test with
`supabase functions serve analyze-meal` before relying on it.
