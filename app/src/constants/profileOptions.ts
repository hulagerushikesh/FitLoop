import type { ActivityLevel, GoalType, Sex } from '../types/database';
import type { Option } from '../components/OptionPicker';

export const SEX_OPTIONS: Option<Sex>[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const ACTIVITY_OPTIONS: Option<ActivityLevel>[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise, desk job' },
  { value: 'light', label: 'Lightly active', description: 'Light exercise 1-3 days/week' },
  { value: 'moderate', label: 'Moderately active', description: 'Moderate exercise 3-5 days/week' },
  { value: 'active', label: 'Active', description: 'Hard exercise 6-7 days/week' },
  { value: 'very_active', label: 'Very active', description: 'Very hard training or physical job' },
];

export const GOAL_OPTIONS: Option<GoalType>[] = [
  { value: 'fat_loss', label: 'Lose fat', description: 'Eat in a calorie deficit' },
  { value: 'muscle_gain', label: 'Build muscle', description: 'Eat in a calorie surplus' },
  { value: 'maintenance', label: 'Maintain', description: 'Stay around your current weight' },
];

export const RATE_BOUNDS: Record<GoalType, { min: number; max: number; default: number }> = {
  fat_loss: { min: -1.0, max: -0.1, default: -0.5 },
  muscle_gain: { min: 0.1, max: 0.5, default: 0.25 },
  maintenance: { min: 0, max: 0, default: 0 },
};

export function formatRate(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)} kg/week`;
}
