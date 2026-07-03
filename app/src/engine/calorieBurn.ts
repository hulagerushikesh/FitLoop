// Calorie burn estimation using the standard MET formula:
//   calories = MET x weight(kg) x duration(hours)
// MET values live on each exercise (supabase/seed_exercises.sql). A
// workout session mixes exercises with different MET values, so we use
// a sets-weighted average MET across the session rather than tracking
// per-set timing (workout_logs doesn't record per-set duration).

export interface SessionExerciseSets {
  metValue: number;
  setCount: number;
}

// Rough estimate for "how long will this take" before a session is
// logged (e.g. a routine preview) — accounts for both the working set
// and the rest between sets.
export const DEFAULT_MINUTES_PER_SET = 3;

export function calculateWeightedAverageMET(exercises: SessionExerciseSets[]): number {
  const totalSets = exercises.reduce((sum, e) => sum + e.setCount, 0);
  if (totalSets === 0) return 0;
  const weightedSum = exercises.reduce((sum, e) => sum + e.metValue * e.setCount, 0);
  return weightedSum / totalSets;
}

export function calculateCaloriesBurned(
  metValue: number,
  weightKg: number,
  durationMinutes: number
): number {
  return Math.round(metValue * weightKg * (durationMinutes / 60));
}

export function estimateDurationMinutes(
  totalSets: number,
  minutesPerSet: number = DEFAULT_MINUTES_PER_SET
): number {
  return totalSets * minutesPerSet;
}

/**
 * Estimates total calories burned for a session made up of several
 * exercises (each with its own MET value and number of sets performed),
 * over the given duration.
 */
export function estimateSessionCalories(
  exercises: SessionExerciseSets[],
  weightKg: number,
  durationMinutes: number
): number {
  const avgMet = calculateWeightedAverageMET(exercises);
  return calculateCaloriesBurned(avgMet, weightKg, durationMinutes);
}
