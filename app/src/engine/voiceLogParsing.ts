// Pure helpers for the unified voice-logging feature. The parse-voice-log edge
// function returns a flattened batch — a transcript plus an ARRAY of items
// (multiple foods/workouts/activities in one utterance). This module reshapes
// that into a typed list, maps an "activity" item into the fields a
// workout_sessions insert needs, and fuzzy-matches a spoken exercise name
// against the user's library as a client-side fallback when the server didn't
// return a match. Framework-free and unit-tested, like the other engine modules.

export interface VoiceWorkoutSet {
  /** Normalized to kilograms (null when bodyweight / not spoken). */
  weightKg: number | null;
  reps: number | null;
}

export interface VoiceFoodItem {
  kind: 'food';
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface VoiceWorkoutItem {
  kind: 'workout';
  exerciseName: string;
  /** Server's fuzzy match against the library, or null. */
  matchedExerciseId: string | null;
  sets: VoiceWorkoutSet[];
  notes: string | null;
}

export interface VoiceActivityItem {
  kind: 'activity';
  activityName: string;
  durationMinutes: number | null;
  estimatedCalories: number | null;
  notes: string | null;
}

export type VoiceItem = VoiceFoodItem | VoiceWorkoutItem | VoiceActivityItem;
export type VoiceKind = VoiceItem['kind'];

export interface VoiceBatch {
  transcript: string;
  items: VoiceItem[];
  /** Set only when items is empty — why nothing could be extracted. */
  message: string | null;
}

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

/** Reshapes one raw item; returns null if it lacks the minimum data for its kind. */
function normalizeItem(raw: unknown): VoiceItem | null {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const kind = r.kind;

  if (kind === 'food') {
    const name = str(r.food_name);
    if (!name) return null;
    return {
      kind: 'food',
      name,
      calories: nonNeg(r.food_calories),
      protein_g: nonNeg(r.food_protein_g),
      carbs_g: nonNeg(r.food_carbs_g),
      fat_g: nonNeg(r.food_fat_g),
    };
  }

  if (kind === 'workout') {
    const exerciseName = str(r.workout_exercise_name);
    const sets = normalizeSets(r.workout_sets);
    if (!exerciseName && sets.length === 0) return null;
    const matched = str(r.workout_matched_exercise_id);
    return {
      kind: 'workout',
      exerciseName,
      matchedExerciseId: matched || null,
      sets,
      notes: str(r.workout_notes) || null,
    };
  }

  if (kind === 'activity') {
    const activityName = str(r.activity_name);
    if (!activityName) return null;
    const duration = num(r.activity_duration_minutes, 0);
    const calories = num(r.activity_estimated_calories, 0);
    return {
      kind: 'activity',
      activityName,
      durationMinutes: duration > 0 ? Math.round(duration) : null,
      estimatedCalories: calories > 0 ? Math.round(calories) : null,
      notes: str(r.activity_notes) || null,
    };
  }

  return null;
}

/**
 * Reshapes the flattened edge-function payload into a typed batch. Invalid items
 * are dropped; when nothing survives, `message` carries a transcript-bearing
 * explanation so the UI always has a safe fallback.
 */
export function normalizeVoiceBatch(raw: unknown): VoiceBatch {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const transcript = str(r.transcript);
  const rawItems = Array.isArray(r.items) ? r.items : [];
  const items = rawItems.map(normalizeItem).filter((i): i is VoiceItem => i !== null);
  const message =
    items.length === 0 ? str(r.unclear_message) || "Couldn't tell what to log — try again." : null;
  return { transcript, items, message };
}

export interface ActivitySessionFields {
  name: string;
  activity_name: string;
  activity_type: string;
  calories_burned: number | null;
  session_date: string;
}

/**
 * Maps an activity item into the columns a workout_sessions row needs. An
 * activity is a completed session with no linked routine (workout_id stays
 * null) — it's flagged via activity_name/activity_type so the calendar and
 * analytics can tell it apart from a lifted routine.
 */
export function activityToSessionFields(
  activity: { activityName: string; estimatedCalories: number | null },
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
 * Resolves the exercise a workout item should pre-select: the server's match
 * when it points at a real library entry, otherwise a client-side fuzzy match
 * on the spoken name. Null means "ask the user to pick".
 */
export function resolveMatchedExercise<T extends { id: string; name: string }>(
  workout: { exerciseName: string; matchedExerciseId: string | null },
  library: T[]
): T | null {
  if (workout.matchedExerciseId) {
    const byId = library.find((e) => e.id === workout.matchedExerciseId);
    if (byId) return byId;
  }
  return fuzzyMatchExercise(workout.exerciseName, library);
}
