import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AnalyticsStackParamList } from './types';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import { stackScreenOptions } from '../theme/navigationTheme';

const Stack = createNativeStackNavigator<AnalyticsStackParamList>();

export default function AnalyticsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="AnalyticsMain"
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
    </Stack.Navigator>
  );
}
