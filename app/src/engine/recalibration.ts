import type { GoalType } from '../types/database';
import { MIN_SAFE_CALORIE_TARGET } from './calorieEngine';

export interface WeightPoint {
  date: string; // YYYY-MM-DD
  weightKg: number;
}

export interface RecalibrationInput {
  weightHistory: WeightPoint[];
  currentCalorieTarget: number;
  targetRateKgPerWeek: number;
  goalType: GoalType;
  /** Minimum deviation (kg/week) before we bother adjusting. Default 0.15. */
  thresholdKgPerWeek?: number;
  /** Safety floor for the adjusted target. Default MIN_SAFE_CALORIE_TARGET. */
  minCalorieFloor?: number;
}

export interface RecalibrationAdjusted {
  adjusted: true;
  newCalorieTarget: number;
  deltaKcal: number;
  actualRateKgPerWeek: number;
  reason: string;
}

export interface RecalibrationSkipped {
  adjusted: false;
  actualRateKgPerWeek: number | null;
  reason: string;
}

export type RecalibrationResult = RecalibrationAdjusted | RecalibrationSkipped;

const MIN_POINTS_PER_WINDOW = 3;
// ~7700 kcal per kg of bodyweight, spread over 7 days.
const KCAL_PER_KG_PER_WEEK_DEVIATION = 1100;

function averageWeight(points: WeightPoint[]): number {
  return points.reduce((sum, p) => sum + p.weightKg, 0) / points.length;
}

function daysBetween(laterDate: string, earlierDate: string): number {
  const ms = new Date(laterDate).getTime() - new Date(earlierDate).getTime();
  return Math.round(ms / 86_400_000);
}

function buildReason(goalType: GoalType, reduced: boolean, magnitudeKcal: number): string {
  switch (goalType) {
    case 'fat_loss':
      return reduced
        ? `Your weight loss was slower than expected this week, so we've reduced your target by ${magnitudeKcal} kcal.`
        : `Your weight loss was faster than expected this week, so we've increased your target by ${magnitudeKcal} kcal to keep it sustainable.`;
    case 'muscle_gain':
      return reduced
        ? `You gained weight faster than expected this week, so we've reduced your target by ${magnitudeKcal} kcal to limit excess fat gain.`
        : `Your weight gain was slower than expected this week, so we've increased your target by ${magnitudeKcal} kcal.`;
    case 'maintenance':
    default:
      return reduced
        ? `Your weight trended up this week, so we've reduced your target by ${magnitudeKcal} kcal to get back to maintenance.`
        : `Your weight trended down this week, so we've increased your target by ${magnitudeKcal} kcal to get back to maintenance.`;
  }
}

/**
 * Compares the actual 7-day-vs-previous-7-day weight trend against the
 * user's declared target rate, and proposes a calorie target adjustment
 * if the deviation exceeds the threshold. Returns `adjusted: false` (with
 * a human-readable reason) when there isn't enough data yet or the trend
 * is already on track.
 */
export function computeRecalibration(input: RecalibrationInput): RecalibrationResult {
  const {
    weightHistory,
    currentCalorieTarget,
    targetRateKgPerWeek,
    goalType,
    thresholdKgPerWeek = 0.15,
    minCalorieFloor = MIN_SAFE_CALORIE_TARGET,
  } = input;

  const sorted = [...weightHistory].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) {
    return { adjusted: false, actualRateKgPerWeek: null, reason: 'Not enough weigh-ins yet to recalibrate.' };
  }

  const latestDate = sorted[sorted.length - 1].date;
  const recentWindow = sorted.filter((p) => daysBetween(latestDate, p.date) <= 6);
  const previousWindow = sorted.filter((p) => {
    const diff = daysBetween(latestDate, p.date);
    return diff >= 7 && diff <= 13;
  });

  if (recentWindow.length < MIN_POINTS_PER_WINDOW || previousWindow.length < MIN_POINTS_PER_WINDOW) {
    return {
      adjusted: false,
      actualRateKgPerWeek: null,
      reason: `Not enough weigh-ins yet to recalibrate — log your weight at least ${MIN_POINTS_PER_WINDOW} times a week for two weeks.`,
    };
  }

  const actualRateKgPerWeek = averageWeight(recentWindow) - averageWeight(previousWindow);
  const deviation = actualRateKgPerWeek - targetRateKgPerWeek;

  if (Math.abs(deviation) <= thresholdKgPerWeek) {
    return {
      adjusted: false,
      actualRateKgPerWeek,
      reason: 'Your trend is on track — no change to your target this week.',
    };
  }

  const reduced = deviation > 0;
  const rawKcal = Math.abs(deviation) * KCAL_PER_KG_PER_WEEK_DEVIATION;
  const magnitudeKcal = Math.min(300, Math.max(50, Math.round(rawKcal / 25) * 25));
  const proposedTarget = currentCalorieTarget + (reduced ? -magnitudeKcal : magnitudeKcal);
  const newCalorieTarget = Math.max(minCalorieFloor, proposedTarget);

  return {
    adjusted: true,
    newCalorieTarget,
    deltaKcal: newCalorieTarget - currentCalorieTarget,
    actualRateKgPerWeek,
    reason: buildReason(goalType, reduced, magnitudeKcal),
  };
}
