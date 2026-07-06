import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from './types';
import ProfileScreen from '../screens/profile/ProfileScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import AccountScreen from '../screens/profile/AccountScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';
import PreferencesScreen from '../screens/profile/PreferencesScreen';
import DataExportScreen from '../screens/profile/DataExportScreen';
import AboutScreen from '../screens/profile/AboutScreen';
import { useTheme } from '../theme';
import { buildStackScreenOptions } from '../theme/navigationTheme';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={buildStackScreenOptions(theme)}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="CalendarMain" component={CalendarScreen} options={{ title: 'Calendar' }} />
      <Stack.Screen name="AnalyticsMain" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
      <Stack.Screen name="Preferences" component={PreferencesScreen} options={{ title: 'Preferences' }} />
      <Stack.Screen name="DataExport" component={DataExportScreen} options={{ title: 'Your Data' }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
    </Stack.Navigator>
  );
}
