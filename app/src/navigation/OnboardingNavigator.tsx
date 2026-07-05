import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';
import { OnboardingProvider } from '../screens/onboarding/OnboardingContext';
import BasicsStep from '../screens/onboarding/BasicsStep';
import ActivityStep from '../screens/onboarding/ActivityStep';
import GoalStep from '../screens/onboarding/GoalStep';
import { useTheme } from '../theme';
import { buildStackScreenOptions } from '../theme/navigationTheme';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  const theme = useTheme();
  return (
    <OnboardingProvider>
      <Stack.Navigator screenOptions={{ ...buildStackScreenOptions(theme), headerShown: false }}>
        <Stack.Screen name="Basics" component={BasicsStep} />
        <Stack.Screen name="Activity" component={ActivityStep} />
        <Stack.Screen name="Goal" component={GoalStep} />
      </Stack.Navigator>
    </OnboardingProvider>
  );
}
