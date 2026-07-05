import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Theme, useTheme, useThemedStyles } from '../../theme';
import { tapHaptic } from '../../utils/haptics';

interface Props {
  label?: string;
  /** Raw text state so partially-typed values ("12.") survive; parse at submit. */
  value: string;
  onChangeText: (text: string) => void;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  placeholder?: string;
  style?: ViewStyle;
}

/**
 * One-thumb number entry: +/- steppers (44px targets) around a directly
 * editable numeric field, for mid-set logging where typing is slow.
 */
export default function NumberInput({
  label,
  value,
  onChangeText,
  step = 1,
  min = 0,
  max,
  decimals,
  placeholder = '0',
  style,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const parsed = Number(value);
  const current = Number.isFinite(parsed) ? parsed : 0;
  const places = decimals ?? (step < 1 ? 1 : 0);

  const nudge = (dir: 1 | -1) => {
    tapHaptic();
    let next = current + dir * step;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    onChangeText(String(Number(next.toFixed(places))));
  };

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <Pressable
          style={styles.stepper}
          onPress={() => nudge(-1)}
          accessibilityLabel={`decrease ${label ?? 'value'}`}
        >
          <Minus size={18} color={theme.colors.textPrimary} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          keyboardType="decimal-pad"
          textAlign="center"
        />
        <Pressable
          style={styles.stepper}
          onPress={() => nudge(1)}
          accessibilityLabel={`increase ${label ?? 'value'}`}
        >
          <Plus size={18} color={theme.colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    label: {
      ...t.typography.caption,
      fontFamily: t.typography.label.fontFamily,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      fontSize: 10,
      color: t.colors.textTertiary,
      marginBottom: t.spacing.xs,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
    stepper: {
      width: 44,
      height: 44,
      borderRadius: t.radii.md,
      backgroundColor: t.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      minWidth: 0,
      height: 44,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surface,
      borderRadius: t.radii.md,
      paddingHorizontal: t.spacing.sm,
      ...t.typography.bodyBold,
      fontVariant: ['tabular-nums'],
      color: t.colors.textPrimary,
    },
  });
}
