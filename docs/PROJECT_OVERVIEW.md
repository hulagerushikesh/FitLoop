# FitLoop — Project Overview

A cross-platform (iOS / Android / web) fitness + nutrition tracker with an
adaptive calorie engine, AI meal recognition, and full workout logging. Built
with Expo (React Native + TypeScript) and Supabase.

- **Repo:** github.com/hulagerushikesh/FitLoop
- **Scale:** 30 screens · 18 database tables · 4 edge functions · 107 unit/integration tests
- **Backend project:** Supabase `qedtsattownvjcsqvmyc`

---

## 1. What it does (features)

### Auth & Onboarding
- Email/password auth (Supabase Auth), password reset.
- 3-step onboarding wizard (body stats → activity → goal) that computes a
  personalized calorie + macro target using the Mifflin-St Jeor BMR formula.
- Profile gating: users who haven't finished onboarding are routed to the wizard.

### Home dashboard
- Greeting + **logging-streak** pill.
- Calorie **progress ring** (remaining / eaten) + protein bar.
- **Muscle-recovery** chips and a "best workout for today" suggestion (recovery model).
- Streak-aware quick actions that deep-link directly into logging flows.

### Nutrition
- **AI meal recognition** — describe a meal *or* photograph it; Gemini estimates
  calories + macros (via the `analyze-meal` edge function).
- **Barcode scanning** (expo-camera) → Open Food Facts lookup, cached locally.
- Manual entry, a **meal builder** (reusable meals with items), **water tracking**,
  a **meal-photo gallery**, and a nutrition history view with adherence.

### Workouts
- Day-of-week scheduled routines; a standard 5-day split auto-seeds on onboarding.
- 55-exercise library with instructions + tutorial links; custom exercises.
- Fast **session logging**: supersets, RPE, set types, **1RM PR detection**
  (Epley), a **plate calculator**, **rest timer**, and voice set entry (web).
- **MET-based calorie burn** and a **muscle-recovery model** (per-group recovery hours).

### Analytics
- Per-exercise **strength (1RM) trends**, **weekly training volume** by muscle group.
- **Body-weight trend**, **body measurements**, before/after **progress photos**,
  and **achievement badges**.

### Calendar
- GitHub-style **consistency heatmap** (13-week rolling window) + monthly grid.
- Tap any day for a detail sheet (calories in/burned, protein, workouts).

### Notifications
- **Local reminders** (meal, workout, weekly recap, streak) wired to Settings toggles.
- **True server-sent push** built (Expo push tokens + `daily-reminders` streak-at-risk
  job) — activates on an EAS build.

### Profile & Settings
- Units (metric/imperial), light/dark/auto theme, avatar upload.
- Full **data export** (JSON + CSV), account deletion (`delete-account` edge function).

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| App framework | **Expo SDK 57**, React Native, **TypeScript** |
| Navigation | React Navigation (bottom tabs + native stacks) |
| Backend | **Supabase** — Postgres, Auth, Storage, Edge Functions (Deno) |
| AI | **Gemini 2.5 Flash** (server-side edge function) |
| Charts | `react-native-svg` (custom Sparkline, StackedBarChart, ProgressRing) |
| Native modules | expo-notifications, -camera, -image-picker, -device, -haptics, -constants |
| Connectivity/storage | `@react-native-community/netinfo`, AsyncStorage |
| Fonts/icons | `@expo-google-fonts/inter`, `lucide-react-native` |
| Testing | Jest + `jest-expo` + React Native Testing Library (**107 tests**) |
| Build/ship | **EAS Build / Submit** |

---

## 3. How it's implemented (architecture)

```
app/src/
  engine/       Pure, framework-free logic — 100% unit-tested
  services/     Supabase queries + side-effectful integrations
  screens/      30 screens grouped by module (auth, onboarding, home, nutrition,
                workouts, analytics, calendar, profile)
  components/   Shared UI kit + charts + sheets + ErrorBoundary
  theme/        Design tokens + ThemeContext + useThemedStyles
  hooks/        useAuth, useProfile, useUnits
  navigation/   Tab + stack navigators
supabase/
  migrations/   0002–0010 (additive, version-controlled schema)
  functions/    analyze-meal, delete-account, weekly-recalibration, daily-reminders
```

### The "pure engine" pattern (the core idea)
All business logic lives in `engine/` as **pure functions with no React or
network dependencies**, so it's trivially unit-testable and reusable on both
client and server. 14 modules:

`calorieEngine` · `recalibration` · `oneRepMax` · `calorieBurn` ·
`muscleRecovery` · `progressiveOverload` · `analytics` · `heatmap` ·
`achievements` · `sessionSets` · `rateLimit` · `retry` · `offlineQueue` ·
`notificationSchedule`

Screens stay thin: they call a **service** (Supabase I/O) and feed the result to
an **engine** function for computation/formatting.

### Design system
- Theme = tokens (colors light+dark, Inter type scale, spacing, radii, shadows).
- `ThemeContext` persists system/light/dark to AsyncStorage; components consume
  it via `useThemedStyles(createStyles)` — no hardcoded colors anywhere.
- A dark, "bold & energetic" lime-accent theme.
- `WebAppFrame` renders the mobile-first UI as a centered phone frame on web.

### Reliability & performance
- **Per-tab error boundaries** — a crash in one tab shows a recoverable fallback,
  not a white screen.
- **AI retry-with-backoff** + a client **sliding-window rate limit** (protects the
  Gemini bill).
- **Offline set-log queue** — set writes that fail mid-workout are persisted to
  AsyncStorage and replayed in order when connectivity returns (NetInfo); today's
  data is read-through cached.
- Long lists use windowed `FlatList`.

### Backend (Supabase edge functions, Deno)
- `analyze-meal` — Gemini calorie/macro estimation (text or photo); validates
  input, key read only via `Deno.env.get`.
- `weekly-recalibration` — compares 7-day weight trend vs. goal and inserts an
  adjusted target; scheduled Mondays 06:00 UTC via **pg_cron + pg_net**.
- `delete-account` — resolves the caller from their JWT and deletes only their
  own data.
- `daily-reminders` — streak-at-risk push to users who haven't logged today
  (built; activates with an EAS build).

---

## 4. Data model (18 tables)

`profiles` · `goals` · `body_metrics` · `body_measurements` · `exercises` ·
`workouts` · `workout_exercises` · `workout_sessions` · `workout_logs` ·
`muscle_group_fatigue` · `food_items` · `meals` · `meal_items` · `food_logs` ·
`water_logs` · `progress_photos` · `achievements` · `push_tokens`

Storage buckets: `avatars`, `exercise-photos`, `meal-photos`, `progress-photos`.

Schema evolves through additive migrations `0002`–`0010`, all tracked in the
Supabase migration history.

---

## 5. Security

- **Row Level Security on every table** — each scoped to `auth.uid() = user_id`
  (or a join-based check for child tables like `workout_exercises` →
  `workouts.user_id`). Verified by `supabase/verify_rls.sql`; documented in
  `supabase/SECURITY_REVIEW.md`.
- Secrets (Gemini + service-role keys) are read **only server-side** via
  `Deno.env.get`; the client bundle ships only the publishable anon key. No key
  was ever committed to git.
- Edge-function inputs are validated; JWT verification is on by default.

---

## 6. Testing

- **107 tests across 18 suites**, `tsc --noEmit` clean.
- Every `engine/` module is unit-tested (calorie math, 1RM, recovery, heatmap,
  rate-limit, offline-queue replay ordering, etc.).
- Integration test: the onboarding→calorie-target flow (React Native Testing Library).
- Run: `cd app && npx jest` and `npx tsc --noEmit`.

---

## 7. Running & shipping

- **Web preview:** `cd app && npm run web`
- **On a phone (Expo Go):** `cd app && npx expo start`, scan the QR — see
  `app/RUN_ON_PHONE.md`.
- **Dev build / stores (EAS):** `eas build` / `eas submit` — full steps and
  account requirements in `app/RUN_ON_PHONE.md`.

### Build history
Delivered as a 12-phase upgrade (`upgrade-plan.txt`): design-system overhaul →
onboarding/auth polish → workout depth → nutrition depth → analytics → calendar
& home → notifications → reliability/offline → security → testing → release
polish. Each phase was built on its own branch, tested, and verified before the
next.
