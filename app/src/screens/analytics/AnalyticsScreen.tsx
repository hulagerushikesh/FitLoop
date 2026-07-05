import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart3 } from "lucide-react-native";
import ScreenContainer from '../../components/ScreenContainer';
import { Theme, useTheme, useThemedStyles } from '../../theme';

export default function AnalyticsScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.iconBadge}>
        <BarChart3 size={28} color={t.colors.accent} />
      </View>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>
        Weight trend, strength progress, and adherence streaks will live here soon.
      </Text>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: t.spacing.xxl },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: t.radii.xl,
    backgroundColor: t.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.lg,
  },
  title: { ...t.typography.h2, color: t.colors.textPrimary, marginBottom: t.spacing.sm },
  subtitle: { ...t.typography.body, color: t.colors.textSecondary, textAlign: 'center' },
});
}
