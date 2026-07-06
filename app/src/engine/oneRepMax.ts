// Estimated one-rep max via the Epley formula: 1RM = w × (1 + reps/30).
// Reasonably accurate in the 1–10 rep range; beyond ~12 reps the estimate
// gets optimistic, so we cap the rep contribution.

const MAX_REPS_FOR_ESTIMATE = 12;

export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  const cappedReps = Math.min(reps, MAX_REPS_FOR_ESTIMATE);
  return Math.round(weightKg * (1 + cappedReps / 30) * 10) / 10;
}

export interface SetForPr {
  weightKg: number | null;
  reps: number | null;
}

/** Best estimated 1RM across a list of sets (0 if none are usable). */
export function bestEstimatedOneRepMax(sets: SetForPr[]): number {
  return sets.reduce((best, s) => {
    if (s.weightKg == null || s.reps == null) return best;
    return Math.max(best, estimateOneRepMax(s.weightKg, s.reps));
  }, 0);
}

/**
 * True when the newly logged set beats the historical best estimated 1RM
 * for that exercise. `historicalBest` of 0 means no usable history — a
 * first-ever weighted set is not celebrated as a PR (everything would be).
 */
export function isNewPr(weightKg: number | null, reps: number | null, historicalBest: number): boolean {
  if (weightKg == null || reps == null || historicalBest <= 0) return false;
  return estimateOneRepMax(weightKg, reps) > historicalBest;
}
