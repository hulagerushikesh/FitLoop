// Daily water goal — a pure, deterministic heuristic. Same inputs always yield
// the same target, so a user with unchanged data never sees a shifting goal.
//
// Baseline is ~35 ml per kg of body weight (a common clinical rule of thumb),
// with a bump for more active people (greater sweat loss). The result is
// rounded to a friendly 250 ml step and clamped to a sane range. No AI.

import type { ActivityLevel } from '../types/database';

const ML_PER_KG = 35;
const DEFAULT_WEIGHT_KG = 70; // used when we don't yet know the user's weight
const STEP_ML = 100;
const MIN_GOAL_ML = 2000;
const MAX_GOAL_ML = 5000;

// Extra fluid to offset sweat loss, by how active the person already is.
const ACTIVITY_BONUS_ML: Record<ActivityLevel, number> = {
  sedentary: 0,
  light: 250,
  moderate: 500,
  active: 750,
  very_active: 1000,
};

/**
 * Computes a daily water goal in millilitres from body weight and activity
 * level. Weight drives the baseline; activity adds a sweat-loss allowance.
 * Falls back to a sensible default weight when none is known.
 */
export function computeWaterGoalMl(
  weightKg: number | null | undefined,
  activityLevel: ActivityLevel | null | undefined
): number {
  const weight = weightKg && weightKg > 0 ? weightKg : DEFAULT_WEIGHT_KG;
  const base = weight * ML_PER_KG;
  const bonus = activityLevel ? ACTIVITY_BONUS_ML[activityLevel] : 0;
  const rounded = Math.round((base + bonus) / STEP_ML) * STEP_ML;
  return Math.min(MAX_GOAL_ML, Math.max(MIN_GOAL_ML, rounded));
}

/** Fraction of the daily goal met (0–1, capped at 1 for progress bars). */
export function hydrationProgress(consumedMl: number, goalMl: number): number {
  if (goalMl <= 0) return 0;
  return Math.min(1, Math.max(0, consumedMl / goalMl));
}
