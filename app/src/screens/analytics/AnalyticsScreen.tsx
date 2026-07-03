import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme/theme';

export default function AnalyticsScreen() {
  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.iconBadge}>
        <Ionicons name="stats-chart" size={28} color={COLORS.accent} />
      </View>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>
        Weight trend, strength progress, and adherence streaks will live here soon.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: { ...TYPOGRAPHY.h2, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  subtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center' },
});
