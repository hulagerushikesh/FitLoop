import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';
import Button from '../components/Button';
import { COLORS, SPACING } from '../theme/theme';
import { navigationTheme } from '../theme/navigationTheme';

export default function RootNavigator() {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error, refresh } = useProfile();

  if (authLoading || (session && profileLoading)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (session && error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Button label="Retry" variant="secondary" onPress={refresh} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {!session ? (
        <AuthNavigator />
      ) : !profile?.onboarding_completed ? (
        <OnboardingNavigator />
      ) : (
        <MainTabNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
    backgroundColor: COLORS.background,
  },
  error: { color: COLORS.danger, marginBottom: SPACING.lg, textAlign: 'center' },
});
