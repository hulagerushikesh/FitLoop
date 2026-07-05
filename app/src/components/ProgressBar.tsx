import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme, useTheme, useThemedStyles } from '../theme';

interface Props {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color?: string;
}

export default function ProgressBar({ label, current, target, unit = '', color }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const pct = target > 0 ? Math.min(1, current / target) : 0;
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          <Text style={styles.valueCurrent}>{Math.round(current)}</Text>
          {' / '}
          {Math.round(target)}
          {unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct * 100}%`, backgroundColor: color ?? theme.colors.accent },
          ]}
        />
      </View>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: { marginBottom: t.spacing.lg },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: t.spacing.sm },
    label: { ...t.typography.label, color: t.colors.textSecondary },
    value: { ...t.typography.caption, fontVariant: ['tabular-nums'], color: t.colors.textSecondary },
    valueCurrent: { color: t.colors.textPrimary, fontFamily: t.typography.bodyBold.fontFamily },
    track: {
      height: 8,
      borderRadius: t.radii.full,
      backgroundColor: t.colors.surfaceElevated,
      overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: t.radii.full },
  });
}
