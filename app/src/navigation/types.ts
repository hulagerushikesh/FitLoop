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

export type NutritionStackParamList = {
  NutritionHome: undefined;
  LogMeal: { mode?: 'manual' | 'text' | 'photo' | 'saved' } | undefined;
  NutritionHistory: undefined;
};

export type WorkoutsStackParamList = {
  WorkoutsHome: undefined;
  ExerciseLibrary: { selectMode?: boolean } | undefined;
  ExerciseDetail: { exerciseId: string };
  RoutineBuilder: { workoutId?: string; selectedExerciseId?: string; initialDayOfWeek?: number } | undefined;
  WorkoutSession: { workoutId: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  CalendarMain: undefined;
  AnalyticsMain: undefined;
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
