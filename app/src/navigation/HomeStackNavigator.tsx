import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HomeStackParamList } from './types';
import HomeScreen from '../screens/home/HomeScreen';
import { useTheme } from '../theme';
import { buildStackScreenOptions } from '../theme/navigationTheme';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={buildStackScreenOptions(theme)}>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Home' }} />
    </Stack.Navigator>
  );
}
