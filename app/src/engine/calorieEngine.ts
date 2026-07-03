import type { ActivityLevel, GoalType, Sex } from '../types/database';

// Mifflin-St Jeor sex offset. 'other' uses the midpoint of the male (+5)
// and female (-161) offsets — there's no standard formula for a
// non-binary offset, so this is a reasonable approximation, not a
// clinical calculation.
const SEX_OFFSET: Record<Sex, number> = {
  male: 5,
  female: -161,
  other: -78,
};

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Fraction adjustment applied to TDEE to get the initial calorie target.
const GOAL_CALORIE_ADJUSTMENT: Record<GoalType, number> = {
  fat_loss: -0.2, // -20%
  muscle_gain: 0.125, // +12.5% (midpoint of the +10-15% range)
  maintenance: 0,
};

// Protein target in grams per kg of bodyweight, chosen per goal within
// the spec's 1.6-2.2 g/kg range (higher for goals where muscle
// preservation/growth matters most).
const PROTEIN_G_PER_KG: Record<GoalType, number> = {
  fat_loss: 2.2,
  muscle_gain: 1.8,
  maintenance: 1.6,
};

// Midpoint of the spec's 25-30% fat-of-calories range.
const FAT_PERCENT_OF_CALORIES = 0.275;

const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_FAT = 9;

// Floor so recalibration (module 3) or a low TDEE can never push a
// prescribed target below what's generally considered safe.
export const MIN_SAFE_CALORIE_TARGET = 1200;

export interface BmrInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}

export function calculateBMR({ sex, weightKg, heightCm, age }: BmrInput): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + SEX_OFFSET[sex];
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export function calculateCalorieTarget(tdee: number, goalType: GoalType): number {
  const target = Math.round(tdee * (1 + GOAL_CALORIE_ADJUSTMENT[goalType]));
  return Math.max(MIN_SAFE_CALORIE_TARGET, target);
}

export interface MacroTargets {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export function calculateMacros(
  weightKg: number,
  calorieTarget: number,
  goalType: GoalType
): MacroTargets {
  const protein_g = Math.round(weightKg * PROTEIN_G_PER_KG[goalType]);
  const fat_g = Math.round((calorieTarget * FAT_PERCENT_OF_CALORIES) / KCAL_PER_G_FAT);

  const proteinKcal = protein_g * KCAL_PER_G_PROTEIN;
  const fatKcal = fat_g * KCAL_PER_G_FAT;
  const remainingKcal = calorieTarget - proteinKcal - fatKcal;
  const carbs_g = Math.max(0, Math.round(remainingKcal / KCAL_PER_G_CARB));

  return { calories: calorieTarget, protein_g, fat_g, carbs_g };
}

export interface InitialTargetsInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  goalType: GoalType;
}

export interface InitialTargets extends MacroTargets {
  bmr: number;
  tdee: number;
}

export function computeInitialTargets(input: InitialTargetsInput): InitialTargets {
  const bmr = calculateBMR(input);
  const tdee = calculateTDEE(bmr, input.activityLevel);
  const calorieTarget = calculateCalorieTarget(tdee, input.goalType);
  const macros = calculateMacros(input.weightKg, calorieTarget, input.goalType);

  return { ...macros, bmr: Math.round(bmr), tdee: Math.round(tdee) };
}
