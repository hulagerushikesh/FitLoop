# FitLoop — Security Review (Phase 9)

Date: 2026-07-06

## 1. Row Level Security (RLS) coverage

Every application table in the `public` schema has **RLS enabled** and at least
one **user-scoped policy**, verified against the migration source. Run
[`verify_rls.sql`](./verify_rls.sql) in the Supabase SQL Editor to confirm
against the live database (queries 1 and 2 should return **zero rows**).

| Table | RLS | Scoping |
|-------|-----|---------|
| profiles | ✅ | `auth.uid() = id` |
| body_metrics | ✅ | `auth.uid() = user_id` |
| goals | ✅ | `auth.uid() = user_id` |
| exercises | ✅ | owner rows `auth.uid() = user_id`; shared library rows read-only |
| workouts | ✅ | `auth.uid() = user_id` |
| workout_exercises | ✅ | join → `workouts.user_id = auth.uid()` |
| workout_sessions | ✅ | `auth.uid() = user_id` |
| workout_logs | ✅ | `auth.uid() = user_id` |
| muscle_group_fatigue | ✅ | `auth.uid() = user_id` |
| food_items | ✅ | owner rows `auth.uid() = user_id`; shared library rows read-only |
| meals | ✅ | `auth.uid() = user_id` |
| meal_items | ✅ | join → `meals.user_id = auth.uid()` |
| food_logs | ✅ | `auth.uid() = user_id` |
| water_logs | ✅ | `auth.uid() = user_id` |
| body_measurements | ✅ | `auth.uid() = user_id` |
| progress_photos | ✅ | `auth.uid() = user_id` |
| achievements | ✅ | `auth.uid() = user_id` |

Storage buckets (`avatars`, `exercise-photos`, `meal-photos`, `progress-photos`)
have per-user object policies keyed on the first path segment being the user's id.

> ⚠️ Migrations `0004`–`0007` (which create `muscle_group_fatigue`,
> `water_logs`, `meal_items`, `body_measurements`, `progress_photos`,
> `achievements` and their policies) are **not yet applied to the live
> database**. Apply them, then re-run `verify_rls.sql`.

## 2. API key / secret safety

- **Gemini API key**: read only server-side via `Deno.env.get('GEMINI_API_KEY')`
  in `functions/analyze-meal`, set with `supabase secrets set`. Never referenced
  in `app/`.
- **Client `.env`** (`app/.env`): contains only `EXPO_PUBLIC_SUPABASE_URL` and
  the **publishable** anon key (`sb_publishable_…`), which is designed to ship in
  the client bundle; access is enforced by RLS. It is gitignored.
- **Service role key**: only ever read via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`
  inside edge functions (`delete-account`, `weekly-recalibration`). Never in `app/`.
- **Git history scan**: no real API key (`AIza…`), service-role value, or secret
  key was ever committed — only `Deno.env.get(...)` references and placeholder
  docs. **No key rotation is required.**

## 3. Edge function input validation

- **analyze-meal**: validates JSON body (malformed → 400), requires
  `mode ∈ {text, photo}`, enforces `description` type + 500-char cap, and for
  photos enforces `imageBase64` type, a ~5 MB size cap, and an allowed-MIME
  list — rejecting bad requests before they reach Gemini or incur cost.
  A client-side sliding-window rate limit (12 calls / 10 min, Phase 8) adds a
  second layer of cost protection.
- **delete-account**: resolves the caller from their JWT (`auth.getUser()`),
  never trusting a user id in the body.
- **weekly-recalibration**: scheduled/service-role job with no user-supplied input.

JWT verification is on by default for all functions (no `verify_jwt = false`
override in `config.toml`).
