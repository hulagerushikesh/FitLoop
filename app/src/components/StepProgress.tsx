import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme, useThemedStyles } from '../theme';

interface Props {
  step: number; // 1-indexed
  total: number;
}

export default function StepProgress({ step, total }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.segment, i < step && styles.segmentActive]} />
        ))}
      </View>
      <Text style={styles.counter}>
        Step {step} of {total}
      </Text>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    wrap: { marginBottom: t.spacing.xl },
    row: { flexDirection: 'row', gap: t.spacing.xs },
    segment: {
      flex: 1,
      height: 4,
      borderRadius: t.radii.full,
      backgroundColor: t.colors.surfaceElevated,
    },
    segmentActive: { backgroundColor: t.colors.accent },
    counter: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: t.spacing.sm },
  });
}
