// Muscle recovery model (Fitbod-style heuristic).
//
// Each muscle group has a nominal recovery window; training it stamps
// last_trained_at, and recovery progresses linearly back to "fresh".
// The windows are deliberately configurable constants, not magic numbers.

import type { MuscleGroup } from '../types/database';

export const RECOVERY_HOURS: Record<MuscleGroup, number> = {
  legs: 72,
  back: 72,
  chest: 60,
  full_body: 60,
  shoulders: 48,
  arms: 48,
  forearms: 48,
  core: 36,
  cardio: 24,
};

export type RecoveryStatus = 'fresh' | 'recovering' | 'fatigued';

export interface MuscleRecoveryState {
  muscleGroup: MuscleGroup;
  /** 0 = just trained, 1 = fully recovered */
  recoveryFraction: number;
  status: RecoveryStatus;
}

const FATIGUED_BELOW = 0.5;
const FRESH_AT = 0.9;

export function recoveryFraction(
  lastTrainedAt: Date,
  recoveryHours: number,
  now: Date
): number {
  const hoursSince = (now.getTime() - lastTrainedAt.getTime()) / 3_600_000;
  if (hoursSince <= 0) return 0;
  return Math.min(1, hoursSince / recoveryHours);
}

export function statusFor(fraction: number): RecoveryStatus {
  if (fraction < FATIGUED_BELOW) return 'fatigued';
  if (fraction < FRESH_AT) return 'recovering';
  return 'fresh';
}

export interface FatigueRow {
  muscle_group: MuscleGroup;
  last_trained_at: string;
  estimated_recovery_hours: number;
}

/** Recovery state for every muscle group; untouched groups are fresh. */
export function computeRecoveryStates(
  rows: FatigueRow[],
  now: Date,
  allGroups: MuscleGroup[] = Object.keys(RECOVERY_HOURS) as MuscleGroup[]
): MuscleRecoveryState[] {
  const byGroup = new Map(rows.map((r) => [r.muscle_group, r]));
  return allGroups.map((muscleGroup) => {
    const row = byGroup.get(muscleGroup);
    const fraction = row
      ? recoveryFraction(new Date(row.last_trained_at), row.estimated_recovery_hours, now)
      : 1;
    return { muscleGroup, recoveryFraction: fraction, status: statusFor(fraction) };
  });
}

export interface RankableRoutine {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
}

export interface RankedRoutine extends RankableRoutine {
  /** 0..1 — mean recovery across the muscle groups the routine trains */
  score: number;
}

/**
 * Ranks the user's own routines by how recovered their target muscle
 * groups are right now — the best "what should I do today" candidate
 * first. Routines with no known muscle groups rank last.
 */
export function rankRoutinesByRecovery(
  routines: RankableRoutine[],
  states: MuscleRecoveryState[]
): RankedRoutine[] {
  const fractionByGroup = new Map(states.map((s) => [s.muscleGroup, s.recoveryFraction]));
  return routines
    .map((routine) => {
      const fractions = routine.muscleGroups.map((g) => fractionByGroup.get(g) ?? 1);
      const score =
        fractions.length === 0
          ? 0
          : fractions.reduce((sum, f) => sum + f, 0) / fractions.length;
      return { ...routine, score };
    })
    .sort((a, b) => b.score - a.score);
}

/** sets × reps × weight summed — the standard volume measure. */
export function sessionVolumeByMuscleGroup(
  logs: { muscleGroup: MuscleGroup; weightKg: number | null; reps: number | null }[]
): Map<MuscleGroup, number> {
  const volume = new Map<MuscleGroup, number>();
  for (const log of logs) {
    const setVolume = (log.weightKg ?? 0) * (log.reps ?? 0);
    volume.set(log.muscleGroup, (volume.get(log.muscleGroup) ?? 0) + setVolume);
  }
  return volume;
}
