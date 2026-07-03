import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from './types';
import ProfileScreen from '../screens/profile/ProfileScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import { stackScreenOptions } from '../theme/navigationTheme';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen name="CalendarMain" component={CalendarScreen} options={{ title: 'Calendar' }} />
      <Stack.Screen name="AnalyticsMain" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
    </Stack.Navigator>
  );
}
