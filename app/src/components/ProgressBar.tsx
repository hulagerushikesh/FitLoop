import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/theme';

interface Props {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color?: string;
}

export default function ProgressBar({ label, current, target, unit = '', color = COLORS.accent }: Props) {
  const pct = target > 0 ? Math.min(1, current / target) : 0;
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          <Text style={{ color: COLORS.textPrimary, fontWeight: '800' }}>{Math.round(current)}</Text>
          {' / '}
          {Math.round(target)}
          {unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  label: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, textTransform: 'uppercase' },
  value: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  track: { height: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceHigh, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: RADIUS.full },
});
