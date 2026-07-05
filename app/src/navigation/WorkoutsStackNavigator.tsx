import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { WorkoutsStackParamList } from './types';
import WorkoutsHomeScreen from '../screens/workouts/WorkoutsHomeScreen';
import ExerciseLibraryScreen from '../screens/workouts/ExerciseLibraryScreen';
import ExerciseDetailScreen from '../screens/workouts/ExerciseDetailScreen';
import RoutineBuilderScreen from '../screens/workouts/RoutineBuilderScreen';
import WorkoutSessionScreen from '../screens/workouts/WorkoutSessionScreen';
import { useTheme } from '../theme';
import { buildStackScreenOptions } from '../theme/navigationTheme';

const Stack = createNativeStackNavigator<WorkoutsStackParamList>();

export default function WorkoutsStackNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={buildStackScreenOptions(theme)}>
      <Stack.Screen name="WorkoutsHome" component={WorkoutsHomeScreen} options={{ title: 'Workouts' }} />
      <Stack.Screen
        name="ExerciseLibrary"
        component={ExerciseLibraryScreen}
        options={{ title: 'Exercise Library' }}
      />
      <Stack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
        options={{ title: 'Exercise' }}
      />
      <Stack.Screen
        name="RoutineBuilder"
        component={RoutineBuilderScreen}
        options={{ title: 'Routine' }}
      />
      <Stack.Screen
        name="WorkoutSession"
        component={WorkoutSessionScreen}
        options={{ title: 'Workout' }}
      />
    </Stack.Navigator>
  );
}
