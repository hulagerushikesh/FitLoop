import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NutritionStackParamList } from './types';
import NutritionHomeScreen from '../screens/nutrition/NutritionHomeScreen';
import LogMealScreen from '../screens/nutrition/LogMealScreen';
import NutritionHistoryScreen from '../screens/nutrition/NutritionHistoryScreen';
import { stackScreenOptions } from '../theme/navigationTheme';

const Stack = createNativeStackNavigator<NutritionStackParamList>();

export default function NutritionStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="NutritionHome" component={NutritionHomeScreen} options={{ title: 'Nutrition' }} />
      <Stack.Screen name="LogMeal" component={LogMealScreen} options={{ title: 'Log Food' }} />
      <Stack.Screen name="NutritionHistory" component={NutritionHistoryScreen} options={{ title: 'History' }} />
    </Stack.Navigator>
  );
}
