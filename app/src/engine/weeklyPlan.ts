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

// A body-part ("bro") split — the way most people actually train, named by
// the muscles worked (e.g. "Back & Biceps"), NOT abstract "Upper/Push". More
// training days unlock a more spread-out split.
interface DayTemplate {
  name: string;
  muscleGroups: MuscleGroup[];
}

const DAY_TEMPLATES: Record<number, DayTemplate[]> = {
  3: [
    { name: 'Chest & Triceps', muscleGroups: ['chest', 'arms'] },
    { name: 'Back & Biceps', muscleGroups: ['back', 'arms', 'forearms'] },
    { name: 'Legs & Shoulders', muscleGroups: ['legs', 'shoulders', 'core'] },
  ],
  4: [
    { name: 'Chest & Triceps', muscleGroups: ['chest', 'arms'] },
    { name: 'Back & Biceps', muscleGroups: ['back', 'arms', 'forearms'] },
    { name: 'Shoulders & Abs', muscleGroups: ['shoulders', 'core'] },
    { name: 'Legs', muscleGroups: ['legs', 'core'] },
  ],
  5: [
    { name: 'Chest & Triceps', muscleGroups: ['chest', 'arms'] },
    { name: 'Back & Biceps', muscleGroups: ['back', 'arms', 'forearms'] },
    { name: 'Shoulders', muscleGroups: ['shoulders', 'core'] },
    { name: 'Legs', muscleGroups: ['legs', 'core'] },
    { name: 'Arms & Abs', muscleGroups: ['arms', 'forearms', 'core'] },
  ],
  6: [
    { name: 'Chest & Triceps', muscleGroups: ['chest', 'arms'] },
    { name: 'Back & Biceps', muscleGroups: ['back', 'arms', 'forearms'] },
    { name: 'Shoulders', muscleGroups: ['shoulders', 'core'] },
    { name: 'Legs', muscleGroups: ['legs', 'core'] },
    { name: 'Arms', muscleGroups: ['arms', 'forearms'] },
    { name: 'Full Body & Cardio', muscleGroups: ['full_body', 'cardio'] },
  ],
};

// Weekday assignment (0=Sun…6=Sat) that spreads rest days sensibly.
const WEEKDAYS_BY_COUNT: Record<number, number[]> = {
  3: [1, 3, 5], // Mon, Wed, Fri
  4: [1, 2, 4, 5], // Mon, Tue, Thu, Fri
  5: [1, 2, 3, 4, 5], // Mon–Fri
  6: [1, 2, 3, 4, 5, 6], // Mon–Sat
};

// Set/rep scheme by goal.
const FOCUS_BY_GOAL: Record<GoalType, { focus: TrainingFocus; sets: number; reps: number }> = {
  muscle_gain: { focus: 'hypertrophy', sets: 4, reps: 10 },
  fat_loss: { focus: 'endurance', sets: 3, reps: 15 },
  maintenance: { focus: 'strength', sets: 3, reps: 12 },
};

/**
 * Builds a personalized week as a body-part split with muscle-named days.
 * Cardio is woven into the leg day for fat-loss goals (where conditioning
 * matters most). This is only a STARTING plan — the user can freely edit,
 * rename, reschedule, or delete any day afterward.
 */
export function generateWeeklyPlan(input: WeeklyPlanInput): PlanDay[] {
  const days = trainingDaysPerWeek(input.activityLevel);
  const templates = DAY_TEMPLATES[days] ?? DAY_TEMPLATES[3];
  const weekdays = WEEKDAYS_BY_COUNT[days] ?? WEEKDAYS_BY_COUNT[3];
  const { focus, sets, reps } = FOCUS_BY_GOAL[input.goalType];

  return templates.map((tpl, i) => {
    const groups = [...tpl.muscleGroups];
    if (input.goalType === 'fat_loss' && groups.includes('legs') && !groups.includes('cardio')) {
      groups.push('cardio');
    }
    return {
      name: tpl.name,
      dayOfWeek: weekdays[i],
      splitType: 'custom' as SplitType,
      muscleGroups: groups,
      targetSets: sets,
      targetReps: reps,
      focus,
    };
  });
}
