import type { Option } from '../components/OptionPicker';
import type { MealType } from '../types/database';

export const MEAL_TYPE_OPTIONS: Option<MealType>[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];
