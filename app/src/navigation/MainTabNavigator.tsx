import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { MainTabParamList } from './types';
import HomeStackNavigator from './HomeStackNavigator';
import NutritionStackNavigator from './NutritionStackNavigator';
import WorkoutsStackNavigator from './WorkoutsStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';
import { COLORS, SPACING } from '../theme/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Nutrition: 'restaurant',
  Workouts: 'barbell',
  Profile: 'person',
};

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 68,
          paddingTop: SPACING.sm,
          paddingBottom: SPACING.sm,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
        tabBarIcon: ({ color, size, focused }) => {
          const name = TAB_ICONS[route.name as keyof MainTabParamList];
          return <Ionicons name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)} size={size + 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Nutrition" component={NutritionStackNavigator} />
      <Tab.Screen name="Workouts" component={WorkoutsStackNavigator} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}
