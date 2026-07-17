import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

export type OnboardingStackParamList = {
  Basics: undefined;
  Activity: undefined;
  Goal: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
};

export interface LogMealPrefill {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  food_item_id?: string | null;
}

export type NutritionStackParamList = {
  NutritionHome: undefined;
  LogMeal:
    | { mode?: 'search' | 'manual' | 'text' | 'photo' | 'saved'; prefill?: LogMealPrefill; describe?: string }
    | undefined;
  NutritionHistory: undefined;
  BarcodeScanner: undefined;
  MealBuilder: undefined;
  PhotoGallery: undefined;
};

export type WorkoutsStackParamList = {
  WorkoutsHome: undefined;
  ExerciseLibrary: { selectMode?: boolean; returnScreen?: 'RoutineBuilder' | 'WorkoutSession'; workoutId?: string } | undefined;
  ExerciseDetail: { exerciseId: string };
  RoutineBuilder: { workoutId?: string; selectedExerciseId?: string; initialDayOfWeek?: number } | undefined;
  WorkoutSession: { workoutId: string; addedExerciseId?: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  CalendarMain: undefined;
  AnalyticsMain: undefined;
  ProgressGallery: undefined;
  EditProfile: undefined;
  Account: undefined;
  ChangePassword: undefined;
  Preferences: undefined;
  DataExport: undefined;
  About: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Nutrition: NavigatorScreenParams<NutritionStackParamList> | undefined;
  Workouts: NavigatorScreenParams<WorkoutsStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
