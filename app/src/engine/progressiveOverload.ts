// Simple progressive overload suggestion: given the best set from the
// last session for an exercise, suggest either a small weight increase
// at the same reps, or the same weight for one more rep.

export interface LastSet {
  weightKg: number;
  reps: number;
}

export interface OverloadSuggestion {
  weightKg: number;
  reps: number;
  label: string;
}

const DEFAULT_WEIGHT_INCREMENT_KG = 2.5;

export function suggestNextSet(
  lastSet: LastSet,
  weightIncrementKg: number = DEFAULT_WEIGHT_INCREMENT_KG
): OverloadSuggestion[] {
  const heavier = lastSet.weightKg + weightIncrementKg;
  const moreReps = lastSet.reps + 1;
  return [
    { weightKg: heavier, reps: lastSet.reps, label: `${heavier}kg x ${lastSet.reps}` },
    { weightKg: lastSet.weightKg, reps: moreReps, label: `${lastSet.weightKg}kg x ${moreReps}` },
  ];
}

/** Picks the "best" set from a session by weight, then by reps as a tiebreaker. */
export function bestSet(sets: LastSet[]): LastSet | null {
  if (sets.length === 0) return null;
  return sets.reduce((best, s) =>
    s.weightKg > best.weightKg || (s.weightKg === best.weightKg && s.reps > best.reps) ? s : best
  );
}
