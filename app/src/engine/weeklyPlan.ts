// Personalized weekly training plan — a pure, deterministic generator. The
// same profile always yields the same plan, and different profiles get
// genuinely different plans: the number of training days comes from activity
// level, the split shape from the day count, and the set/rep focus (plus any
// cardio) from the goal. No AI, no randomness.

import type { ActivityLevel, GoalType, MuscleGroup, Sex, SplitType } from '../types/database';

export interface WeeklyPlanInput {
  goalType: GoalType;
  activityLevel: ActivityLevel;
  sex: Sex;
}

export type TrainingFocus = 'strength' | 'hypertrophy' | 'endurance';

export interface PlanDay {
  name: string;
  dayOfWeek: number; // 0=Sun … 6=Sat
  splitType: SplitType;
  muscleGroups: MuscleGroup[];
  targetSets: number;
  targetReps: number;
  focus: TrainingFocus;
}

// How many training days a week, by how active the person already is.
const DAYS_BY_ACTIVITY: Record<ActivityLevel, number> = {
  sedentary: 3,
  light: 3,
  moderate: 4,
  active: 5,
  very_active: 6,
};

export function trainingDaysPerWeek(activityLevel: ActivityLevel): number {
  return DAYS_BY_ACTIVITY[activityLevel];
}

// Which split to run for a given number of training days. 3→PPL, 4→U/L twice,
// 5→PPL+U/L, 6→PPL twice.
const SPLIT_SEQUENCE: Record<number, SplitType[]> = {
  3: ['push', 'pull', 'legs'],
  4: ['upper', 'lower', 'upper', 'lower'],
  5: ['push', 'pull', 'legs', 'upper', 'lower'],
  6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
};

// Weekday assignment (0=Sun…6=Sat) that spreads rest days sensibly.
const WEEKDAYS_BY_COUNT: Record<number, number[]> = {
  3: [1, 3, 5], // Mon, Wed, Fri
  4: [1, 2, 4, 5], // Mon, Tue, Thu, Fri
  5: [1, 2, 3, 4, 5], // Mon–Fri
  6: [1, 2, 3, 4, 5, 6], // Mon–Sat
};

interface SplitMeta {
  name: string;
  muscleGroups: MuscleGroup[];
}

const SPLIT_META: Record<SplitType, SplitMeta> = {
  push: { name: 'Push', muscleGroups: ['chest', 'shoulders', 'arms'] },
  pull: { name: 'Pull', muscleGroups: ['back', 'arms', 'forearms'] },
  legs: { name: 'Legs', muscleGroups: ['legs', 'core'] },
  upper: { name: 'Upper Body', muscleGroups: ['chest', 'back', 'shoulders', 'arms'] },
  lower: { name: 'Lower Body', muscleGroups: ['legs', 'core'] },
  full_body: { name: 'Full Body', muscleGroups: ['chest', 'back', 'legs', 'shoulders'] },
  custom: { name: 'Custom', muscleGroups: [] },
};

// Set/rep scheme by goal.
const FOCUS_BY_GOAL: Record<GoalType, { focus: TrainingFocus; sets: number; reps: number }> = {
  muscle_gain: { focus: 'hypertrophy', sets: 4, reps: 10 },
  fat_loss: { focus: 'endurance', sets: 3, reps: 15 },
  maintenance: { focus: 'strength', sets: 3, reps: 12 },
};

/**
 * Builds a personalized week. Cardio is woven into leg/lower days for fat-loss
 * goals (where conditioning matters most). Repeated splits get an A/B suffix so
 * each day reads distinctly.
 */
export function generateWeeklyPlan(input: WeeklyPlanInput): PlanDay[] {
  const days = trainingDaysPerWeek(input.activityLevel);
  const splits = SPLIT_SEQUENCE[days] ?? SPLIT_SEQUENCE[3];
  const weekdays = WEEKDAYS_BY_COUNT[days] ?? WEEKDAYS_BY_COUNT[3];
  const { focus, sets, reps } = FOCUS_BY_GOAL[input.goalType];

  const seen = new Map<SplitType, number>();

  return splits.map((split, i) => {
    const meta = SPLIT_META[split];
    const occurrence = (seen.get(split) ?? 0) + 1;
    seen.set(split, occurrence);

    const groups = [...meta.muscleGroups];
    // Fat-loss: add conditioning to lower-body days for extra calorie burn.
    if (input.goalType === 'fat_loss' && (split === 'legs' || split === 'lower') && !groups.includes('cardio')) {
      groups.push('cardio');
    }

    const total = splits.filter((s) => s === split).length;
    const name = total > 1 ? `${meta.name} ${occurrence === 1 ? 'A' : 'B'}` : meta.name;

    return {
      name,
      dayOfWeek: weekdays[i],
      splitType: split,
      muscleGroups: groups,
      targetSets: sets,
      targetReps: reps,
      focus,
    };
  });
}
