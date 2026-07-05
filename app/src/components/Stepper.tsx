import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Theme, useTheme, useThemedStyles } from '../theme';
import { tapHaptic } from '../utils/haptics';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
}

export default function Stepper({ value, onChange, min, max, step = 0.1, format }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const clamp = (v: number) => Math.min(max, Math.max(min, Number(v.toFixed(2))));

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.button}
        onPress={() => {
          tapHaptic();
          onChange(clamp(value - step));
        }}
        accessibilityLabel="decrease"
      >
        <Minus size={20} color={theme.colors.onAccent} />
      </Pressable>
      <Text style={styles.value}>{format ? format(value) : value.toFixed(1)}</Text>
      <Pressable
        style={styles.button}
        onPress={() => {
          tapHaptic();
          onChange(clamp(value + step));
        }}
        accessibilityLabel="increase"
      >
        <Plus size={20} color={theme.colors.onAccent} />
      </Pressable>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.spacing.xl },
    button: {
      width: 44,
      height: 44,
      borderRadius: t.radii.full,
      backgroundColor: t.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    value: {
      ...t.typography.statSmall,
      minWidth: 110,
      textAlign: 'center',
      color: t.colors.textPrimary,
    },
  });
}
