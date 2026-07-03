# FitLoop

All-in-one gym and nutrition tracker with an adaptive calorie/macro
recommendation engine, workout logging, and a daily planner.

- **Frontend:** Expo (React Native) + TypeScript, in `app/`
- **Backend:** Supabase (Postgres + Auth + Storage), schema in `supabase/`

## Status

Module 1 (project setup) is done: Expo scaffold, tab + stack navigation,
Supabase client wiring, email/password auth screens, and the initial
database schema.

## Getting started

1. Set up Supabase — follow `supabase/README.md`.
2. Install deps and run the app:
   ```
   cd app
   npm install
   npx expo start
   ```
3. Press `i` for iOS simulator, `a` for Android emulator, or scan the QR
   code with Expo Go on your phone. Press `w` for web.

## Folder structure

```
app/
  src/
    components/   shared UI components
    hooks/         useAuth, and future data hooks
    navigation/    tab + stack navigators
    screens/       one folder per tab section
    services/      supabase client, future API wrappers
    types/         TypeScript types mirroring the DB schema
supabase/
  schema.sql       full Postgres schema + RLS policies
```
