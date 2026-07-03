import type { Option } from '../components/OptionPicker';
import type { MuscleGroup, SplitType } from '../types/database';

export const MUSCLE_GROUP_OPTIONS: Option<MuscleGroup>[] = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'legs', label: 'Legs' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'arms', label: 'Arms' },
  { value: 'forearms', label: 'Forearms' },
  { value: 'core', label: 'Core' },
  { value: 'full_body', label: 'Full body' },
  { value: 'cardio', label: 'Cardio' },
];

export const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SPLIT_TYPE_OPTIONS: Option<SplitType>[] = [
  { value: 'push', label: 'Push', description: 'Chest, shoulders, triceps' },
  { value: 'pull', label: 'Pull', description: 'Back, biceps' },
  { value: 'legs', label: 'Legs', description: 'Quads, hamstrings, glutes, calves' },
  { value: 'upper', label: 'Upper', description: 'All upper body' },
  { value: 'lower', label: 'Lower', description: 'All lower body' },
  { value: 'full_body', label: 'Full body', description: 'Everything in one session' },
  { value: 'custom', label: 'Custom', description: 'Your own mix' },
];

// Starter exercise picks per split, in the order they should be performed
// (compound lifts first, isolation last) — matches sort_order in
// supabase/seed_exercises.sql. Used to auto-populate a new routine when
// the user picks a split type, as a editable starting point.
export const SPLIT_TEMPLATE_EXERCISE_NAMES: Record<SplitType, string[]> = {
  push: [
    'Barbell Bench Press',
    'Overhead Press',
    'Incline Dumbbell Press',
    'Lateral Raise',
    'Triceps Pushdown',
  ],
  pull: ['Deadlift', 'Pull-Up', 'Barbell Row', 'Face Pull', 'Barbell Curl'],
  legs: ['Barbell Back Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raise'],
  upper: ['Barbell Bench Press', 'Barbell Row', 'Overhead Press', 'Lat Pulldown', 'Barbell Curl'],
  lower: ['Barbell Back Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raise'],
  full_body: ['Barbell Back Squat', 'Barbell Bench Press', 'Barbell Row', 'Overhead Press', 'Plank'],
  custom: [],
};

export const DEFAULT_REST_SECONDS = 90;

export interface StandardPlanDay {
  name: string;
  dayOfWeek: number; // 0=Sunday ... 6=Saturday
  exerciseNames: string[];
}

// The default "bro split" every new user starts with — a classic 5-day
// gym routine (chest/back/shoulders/legs/abs), fully editable afterward
// via the day-of-week picker and exercise list in the Routine Builder.
// Day mapping is a best guess at "5 consecutive training days ending on
// Sunday" — trivial to fix per-routine if wrong.
export const STANDARD_PLAN: StandardPlanDay[] = [
  {
    name: 'Chest & Triceps',
    dayOfWeek: 3, // Wednesday
    exerciseNames: [
      'Barbell Bench Press',
      'Incline Dumbbell Press',
      'Cable Fly',
      'Dips',
      'Triceps Pushdown',
      'Overhead Triceps Extension',
    ],
  },
  {
    name: 'Back & Biceps',
    dayOfWeek: 4, // Thursday
    exerciseNames: ['Deadlift', 'Pull-Up', 'Barbell Row', 'Lat Pulldown', 'Barbell Curl', 'Dumbbell Hammer Curl'],
  },
  {
    name: 'Shoulders & Forearms',
    dayOfWeek: 5, // Friday
    exerciseNames: ['Overhead Press', 'Dumbbell Shoulder Press', 'Lateral Raise', 'Face Pull', 'Wrist Curl', "Farmer's Carry"],
  },
  {
    name: 'Legs',
    dayOfWeek: 6, // Saturday
    exerciseNames: ['Barbell Back Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raise'],
  },
  {
    name: 'Abs',
    dayOfWeek: 0, // Sunday
    exerciseNames: ['Plank', 'Hanging Leg Raise', 'Cable Crunch', 'Russian Twist'],
  },
];
