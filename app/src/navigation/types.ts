export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
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
};

export type WorkoutsStackParamList = {
  WorkoutsHome: undefined;
  ExerciseLibrary: { selectMode?: boolean } | undefined;
  ExerciseDetail: { exerciseId: string };
  RoutineBuilder: { workoutId?: string; selectedExerciseId?: string; initialDayOfWeek?: number } | undefined;
  WorkoutSession: { workoutId: string };
};

export type CalendarStackParamList = {
  CalendarMain: undefined;
};

export type AnalyticsStackParamList = {
  AnalyticsMain: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Nutrition: undefined;
  Workouts: undefined;
  Calendar: undefined;
  Analytics: undefined;
  Profile: undefined;
};
