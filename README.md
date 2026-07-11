# FitLoop

All-in-one gym and nutrition tracker with an adaptive calorie/macro
recommendation engine, workout logging, and a daily planner.

- **Frontend:** Expo (React Native) + TypeScript, in `app/`
- **Backend:** Supabase (Postgres + Auth + Storage), schema in `supabase/`

A full, working app: auth + onboarding, an adaptive calorie/macro engine, AI
meal recognition (text/photo/**voice**), workout logging with intelligence,
analytics, a consistency calendar with daily progress photos, and local +
push notifications. See [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md)
for the complete feature/tech/architecture write-up.

## Prerequisites

- **Node.js ≥ 20.19.4** (the project runs on 20.12.2 but Expo prints a
  warning — use `nvm install 20.19.4` to clear it).
- **Expo Go** on your phone (App Store / Play Store) for on-device testing.
- Optional: Xcode (iOS Simulator) / Android Studio (Android emulator).
- A Supabase project (already provisioned for this app) — see
  `supabase/README.md` if setting up your own.

## Setup

```bash
cd app
npm install --legacy-peer-deps
```

Create `app/.env` with your Supabase keys (already present for this project):

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

The database schema lives in `supabase/migrations/` — apply any un-run
migrations in the Supabase SQL Editor (see `supabase/README.md`). Edge
functions are in `supabase/functions/` (`supabase functions deploy <name>`).

## Run the app

All commands run from the `app/` folder.

```bash
# On your phone (the primary way — hot-reloads as you edit)
npx expo start
#   → scan the QR: iPhone Camera app, or Expo Go → Scan QR on Android.
#   → phone and Mac must be on the same Wi-Fi (else: npx expo start --tunnel)

# In a browser (quick UI checks — no mic/camera)
npx expo start --web

# On a simulator/emulator
npx expo start --ios       # needs Xcode
npx expo start --android   # needs Android Studio
```

In the running terminal: `r` reload · `m` dev menu · `w` web · `i`/`a`
simulator · `Ctrl+C` stop.

> **Note:** voice logging and progress-photo capture need a real microphone
> and camera, so they only work on a phone (Expo Go), not in the web preview.
> Full store/dev-build instructions are in
> [`app/RUN_ON_PHONE.md`](app/RUN_ON_PHONE.md).

## Checks

```bash
cd app
npx tsc --noEmit   # type-check
npx jest           # unit + integration tests
```

## Folder structure

```
app/
  src/
    engine/        pure, framework-free, unit-tested logic
    services/      Supabase queries + side-effectful integrations
    screens/       one folder per module (home, nutrition, workouts, …)
    components/    shared UI kit, charts, sheets, voice components
    theme/         design tokens + ThemeContext
    hooks/         useAuth, useProfile, useUnits
    navigation/    tab + stack navigators
    types/         TypeScript types mirroring the DB schema
supabase/
  migrations/      additive, version-controlled schema (0002–0012)
  functions/       edge functions (analyze-meal, parse-voice-log, …)
docs/
  PROJECT_OVERVIEW.md   full feature/tech/architecture reference
```
