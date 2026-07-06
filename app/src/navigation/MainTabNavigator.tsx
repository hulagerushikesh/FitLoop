import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, UtensilsCrossed, Dumbbell, CircleUser } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { MainTabParamList } from './types';
import HomeStackNavigator from './HomeStackNavigator';
import NutritionStackNavigator from './NutritionStackNavigator';
import WorkoutsStackNavigator from './WorkoutsStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';
import ErrorBoundary from '../components/ErrorBoundary';
import { FONTS, useTheme } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, LucideIcon> = {
  Home: Home,
  Nutrition: UtensilsCrossed,
  Workouts: Dumbbell,
  Profile: CircleUser,
};

// Each tab's stack is wrapped in its own error boundary so a crash inside one
// tab shows a recoverable fallback there instead of white-screening the app.
// Defined at module scope (not inline) so they aren't remounted every render.
const HomeTab = () => (
  <ErrorBoundary label="Home">
    <HomeStackNavigator />
  </ErrorBoundary>
);
const NutritionTab = () => (
  <ErrorBoundary label="Nutrition">
    <NutritionStackNavigator />
  </ErrorBoundary>
);
const WorkoutsTab = () => (
  <ErrorBoundary label="Workouts">
    <WorkoutsStackNavigator />
  </ErrorBoundary>
);
const ProfileTab = () => (
  <ErrorBoundary label="Profile">
    <ProfileStackNavigator />
  </ErrorBoundary>
);

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
      <Tab.Screen name="Home" component={HomeTab} />
      <Tab.Screen name="Nutrition" component={NutritionTab} />
      <Tab.Screen name="Workouts" component={WorkoutsTab} />
      <Tab.Screen name="Profile" component={ProfileTab} />
    </Tab.Navigator>
  );
}
