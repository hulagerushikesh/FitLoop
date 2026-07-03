import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CalendarStackParamList } from './types';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import { stackScreenOptions } from '../theme/navigationTheme';

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export default function CalendarStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="CalendarMain" component={CalendarScreen} options={{ title: 'Calendar' }} />
    </Stack.Navigator>
  );
}
