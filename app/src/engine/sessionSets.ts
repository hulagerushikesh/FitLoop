// Pure state transitions for in-session set logging. Extracted from
// WorkoutSessionScreen so "logging a set updates the session" is unit-testable
// independent of rendering / network.

export interface SessionSet {
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
}

export type LoggedSets<T extends SessionSet = SessionSet> = Record<string, T[]>;

/** 1-based number for the next set of `exerciseId` (count of existing + 1). */
export function nextSetNumber<T extends SessionSet>(sets: LoggedSets<T>, exerciseId: string): number {
  return (sets[exerciseId]?.length ?? 0) + 1;
}

/** Returns a new map with `input` appended to `exerciseId`'s sets (immutable). */
export function appendSet<T extends SessionSet>(
  sets: LoggedSets<T>,
  exerciseId: string,
  input: T
): LoggedSets<T> {
  return { ...sets, [exerciseId]: [...(sets[exerciseId] ?? []), input] };
}

/** Total sets logged across every exercise in the session. */
export function totalSets<T extends SessionSet>(sets: LoggedSets<T>): number {
  return Object.values(sets).reduce((sum, list) => sum + list.length, 0);
}
