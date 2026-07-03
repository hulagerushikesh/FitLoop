import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../theme/theme';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
}

export default function Stepper({ value, onChange, min, max, step = 0.1, format }: Props) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Number(v.toFixed(2))));

  return (
    <View style={styles.row}>
      <Pressable style={styles.button} onPress={() => onChange(clamp(value - step))}>
        <Text style={styles.buttonText}>−</Text>
      </Pressable>
      <Text style={styles.value}>{format ? format(value) : value.toFixed(1)}</Text>
      <Pressable style={styles.button} onPress={() => onChange(clamp(value + step))}>
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xl },
  button: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: COLORS.accentText, fontSize: 22, fontWeight: '700' },
  value: { fontSize: 20, fontWeight: '800', minWidth: 110, textAlign: 'center', color: COLORS.textPrimary },
});
