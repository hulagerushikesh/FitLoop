import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, UtensilsCrossed, Dumbbell, CircleUser } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { MainTabParamList } from './types';
import HomeStackNavigator from './HomeStackNavigator';
import NutritionStackNavigator from './NutritionStackNavigator';
import WorkoutsStackNavigator from './WorkoutsStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';
import { FONTS, useTheme } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, LucideIcon> = {
  Home: Home,
  Nutrition: UtensilsCrossed,
  Workouts: Dumbbell,
  Profile: CircleUser,
};

export default function MainTabNavigator() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accentEmphasis,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 68,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
        },
        tabBarLabelStyle: { fontSize: 12, fontFamily: FONTS.bold, marginTop: 2 },
        tabBarIcon: ({ color, focused }) => {
          const Icon = TAB_ICONS[route.name as keyof MainTabParamList];
          return <Icon size={24} color={color} strokeWidth={focused ? 2.4 : 1.8} />;
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
