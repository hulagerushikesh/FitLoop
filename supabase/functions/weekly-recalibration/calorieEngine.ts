// Duplicated from app/src/engine/calorieEngine.ts (only the pieces this
// function needs — macro recomputation after a calorie target change).
// Keep in sync with the app copy if the algorithm changes.
import type { GoalType } from './types.ts';

const PROTEIN_G_PER_KG: Record<GoalType, number> = {
  fat_loss: 2.2,
  muscle_gain: 1.8,
  maintenance: 1.6,
};

const FAT_PERCENT_OF_CALORIES = 0.275;
const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_FAT = 9;

export const MIN_SAFE_CALORIE_TARGET = 1200;

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
