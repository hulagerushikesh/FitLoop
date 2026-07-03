import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../theme/theme';

interface Props {
  step: number; // 1-indexed
  total: number;
}

export default function StepProgress({ step, total }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, i < step && styles.segmentActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.xl },
  segment: { flex: 1, height: 4, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceHigh },
  segmentActive: { backgroundColor: COLORS.accent },
});
