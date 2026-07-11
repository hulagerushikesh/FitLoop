// Pure helpers for the unified voice-logging feature. The parse-voice-log edge
// function returns a flattened JSON blob (see supabase/functions/parse-voice-log);
// this module reshapes it into a typed discriminated union, maps an "activity"
// result into the fields a workout_sessions insert needs, and fuzzy-matches a
// spoken exercise name against the user's library as a client-side fallback
// when the server didn't return a match. Framework-free and unit-tested, like
// the other engine modules.

export type VoiceLogType = 'food' | 'workout' | 'activity' | 'unclear';

export interface VoiceFood {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
}

export interface VoiceWorkoutSet {
  /** Normalized to kilograms (null when bodyweight / not spoken). */
  weightKg: number | null;
  reps: number | null;
}

export interface VoiceWorkout {
  exerciseName: string;
  /** Server's fuzzy match against the library, or null. */
  matchedExerciseId: string | null;
  sets: VoiceWorkoutSet[];
  notes: string | null;
}

export interface VoiceActivity {
  activityName: string;
  durationMinutes: number | null;
  estimatedCalories: number | null;
  notes: string | null;
}

export type VoiceLogResult =
  | { type: 'food'; transcript: string; food: VoiceFood }
  | { type: 'workout'; transcript: string; workout: VoiceWorkout }
  | { type: 'activity'; transcript: string; activity: VoiceActivity }
  | { type: 'unclear'; transcript: string; message: string };

const LB_TO_KG = 0.45359237;

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

/** Non-negative rounded number (macros, calories). */
function nonNeg(value: unknown): number {
  return Math.max(0, Math.round(num(value, 0)));
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Spoken weight → kilograms. Null weight (bodyweight) stays null. */
export function toKg(weight: number | null, unit: string | null | undefined): number | null {
  if (weight == null || !Number.isFinite(weight)) return null;
  return unit === 'lb' ? Math.round(weight * LB_TO_KG * 100) / 100 : weight;
}

function normalizeSets(raw: unknown): VoiceWorkoutSet[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      const reps = s && typeof s === 'object' && (s as any).reps != null ? num((s as any).reps, 0) : null;
      const rawWeight =
        s && typeof s === 'object' && (s as any).weight != null ? num((s as any).weight, 0) : null;
      const unit = s && typeof s === 'object' ? ((s as any).unit as string) : undefined;
      return {
        weightKg: rawWeight != null && rawWeight > 0 ? toKg(rawWeight, unit) : null,
        reps: reps != null && reps > 0 ? Math.round(reps) : null,
      };
    })
    .filter((s) => s.reps != null || s.weightKg != null);
}

/**
 * Reshapes the flattened edge-function payload into a typed result. Any payload
 * that doesn't carry enough data for its declared type is downgraded to
 * "unclear" so the UI always has a safe, transcript-bearing fallback rather
 * than a half-empty confirmation form.
 */
export function normalizeVoiceResult(raw: unknown): VoiceLogResult {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const transcript = str(r.transcript);
  const type = r.type as VoiceLogType;

  if (type === 'food') {
    const name = str(r.food_name);
    if (name) {
      return {
        type: 'food',
        transcript,
        food: {
          name,
          calories: nonNeg(r.food_calories),
          protein_g: nonNeg(r.food_protein_g),
          carbs_g: nonNeg(r.food_carbs_g),
          fat_g: nonNeg(r.food_fat_g),
          confidence: Math.min(1, Math.max(0, num(r.food_confidence, 0.5))),
        },
      };
    }
  }

  if (type === 'workout') {
    const exerciseName = str(r.workout_exercise_name);
    const sets = normalizeSets(r.workout_sets);
    if (exerciseName || sets.length > 0) {
      const matched = str(r.workout_matched_exercise_id);
      return {
        type: 'workout',
        transcript,
        workout: {
          exerciseName,
          matchedExerciseId: matched || null,
          sets,
          notes: str(r.workout_notes) || null,
        },
      };
    }
  }

  if (type === 'activity') {
    const activityName = str(r.activity_name);
    if (activityName) {
      const duration = num(r.activity_duration_minutes, 0);
      const calories = num(r.activity_estimated_calories, 0);
      return {
        type: 'activity',
        transcript,
        activity: {
          activityName,
          durationMinutes: duration > 0 ? Math.round(duration) : null,
          estimatedCalories: calories > 0 ? Math.round(calories) : null,
          notes: str(r.activity_notes) || null,
        },
      };
    }
  }

  return {
    type: 'unclear',
    transcript,
    message: str(r.message) || "Couldn't tell whether that was food or a workout.",
  };
}

export interface ActivitySessionFields {
  name: string;
  activity_name: string;
  activity_type: string;
  calories_burned: number | null;
  session_date: string;
}

/**
 * Maps an activity result into the columns a workout_sessions row needs. An
 * activity is a completed session with no linked routine (workout_id stays
 * null) — it's flagged via activity_name/activity_type so the calendar and
 * analytics can tell it apart from a lifted routine.
 */
export function activityToSessionFields(
  activity: VoiceActivity,
  sessionDate: string
): ActivitySessionFields {
  return {
    name: activity.activityName,
    activity_name: activity.activityName,
    activity_type: 'cardio',
    calories_burned: activity.estimatedCalories,
    session_date: sessionDate,
  };
}

function normalizeName(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Client-side fallback fuzzy match of a spoken exercise name against the
 * library, used when the server returned no matched id. Scores by shared-token
 * overlap (Jaccard) with a bonus for a full substring hit; returns the best
 * match above a confidence floor, else null.
 */
export function fuzzyMatchExercise<T extends { id: string; name: string }>(
  spokenName: string,
  library: T[]
): T | null {
  const spokenTokens = normalizeName(spokenName);
  if (spokenTokens.length === 0 || library.length === 0) return null;
  const spokenSet = new Set(spokenTokens);
  const spokenJoined = spokenTokens.join(' ');

  let best: T | null = null;
  let bestScore = 0;
  for (const item of library) {
    const itemTokens = normalizeName(item.name);
    if (itemTokens.length === 0) continue;
    const itemSet = new Set(itemTokens);
    let shared = 0;
    for (const tok of itemSet) if (spokenSet.has(tok)) shared += 1;
    const union = new Set([...spokenSet, ...itemSet]).size;
    let score = union > 0 ? shared / union : 0;
    const itemJoined = itemTokens.join(' ');
    if (spokenJoined.includes(itemJoined) || itemJoined.includes(spokenJoined)) score += 0.3;
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return bestScore >= 0.34 ? best : null;
}

/**
 * Resolves the exercise a workout result should pre-select: the server's match
 * when it points at a real library entry, otherwise a client-side fuzzy match
 * on the spoken name. Null means "ask the user to pick".
 */
export function resolveMatchedExercise<T extends { id: string; name: string }>(
  workout: VoiceWorkout,
  library: T[]
): T | null {
  if (workout.matchedExerciseId) {
    const byId = library.find((e) => e.id === workout.matchedExerciseId);
    if (byId) return byId;
  }
  return fuzzyMatchExercise(workout.exerciseName, library);
}
