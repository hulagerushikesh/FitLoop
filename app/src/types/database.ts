// Mirrors the Supabase schema in /supabase/schema.sql

export type Sex = 'male' | 'female' | 'other';
export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';
export type GoalType = 'fat_loss' | 'muscle_gain' | 'maintenance';
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'forearms'
  | 'core'
  | 'full_body'
  | 'cardio';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodSource = 'usda' | 'off' | 'custom';
export type ExerciseCategory = 'compound' | 'isolation' | 'cardio';
export type SplitType = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body' | 'custom';
export type FoodLogSource = 'manual' | 'food_item' | 'ai_photo' | 'ai_text';

export type UnitSystem = 'metric' | 'imperial';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  age: number | null;
  sex: Sex | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  goal_type: GoalType | null;
  target_rate_kg_per_week: number | null;
  onboarding_completed: boolean;
  unit_system: UnitSystem;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface BodyMetric {
  id: string;
  user_id: string;
  weight_kg: number;
  body_fat_pct: number | null;
  recorded_at: string; // date
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  calorie_target: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  reason: string | null;
  effective_date: string; // date
  created_at: string;
}

export interface Exercise {
  id: string;
  user_id: string | null;
  name: string;
  muscle_group: MuscleGroup;
  equipment: string | null;
  is_custom: boolean;
  category: ExerciseCategory | null;
  sort_order: number;
  met_value: number | null;
  instructions: string | null;
  photo_path: string | null;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  day_of_week: number | null; // 0-6
  split_type: SplitType | null;
  notes: string | null;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_reps: number | null;
  superset_group: number | null;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_id: string | null;
  name: string;
  started_at: string;
  ended_at: string | null;
  calories_burned: number | null;
  session_date: string; // date
  created_at: string;
}

export type SetType = 'normal' | 'drop' | 'failure';

export interface WorkoutLog {
  id: string;
  user_id: string;
  workout_id: string | null;
  session_id: string | null;
  exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  set_type: SetType;
  logged_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

export interface FoodItem {
  id: string;
  external_id: string | null;
  source: FoodSource;
  user_id: string | null;
  name: string;
  brand: string | null;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  volume_ml: number;
  logged_at: string;
  logged_date: string;
}

export interface MealItem {
  id: string;
  meal_id: string;
  food_item_id: string | null;
  name: string;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  food_item_id: string | null;
  meal_id: string | null;
  name: string;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: MealType;
  source: FoodLogSource;
  logged_at: string;
  logged_date: string;
  photo_path: string | null; // date
}

export interface DailySummary {
  user_id: string;
  day: string; // date
  calories_consumed: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories_burned: number;
  workout_count: number;
  water_ml: number;
}

export interface MuscleGroupFatigue {
  user_id: string;
  muscle_group: MuscleGroup;
  last_trained_at: string;
  estimated_recovery_hours: number;
  rolling_volume_7d: number;
  updated_at: string;
}
