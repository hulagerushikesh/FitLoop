import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';
import { Button } from '../components/ui';
import { Theme, useTheme, useThemedStyles } from '../theme';
import { buildNavigationTheme } from '../theme/navigationTheme';

export default function RootNavigator() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error, refresh } = useProfile();

  if (authLoading || (session && profileLoading)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
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
    <NavigationContainer theme={buildNavigationTheme(theme)}>
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

function createStyles(t: Theme) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: t.spacing.xl,
      backgroundColor: t.colors.background,
    },
    error: { ...t.typography.body, color: t.colors.danger, marginBottom: t.spacing.lg, textAlign: 'center' },
  });
}
