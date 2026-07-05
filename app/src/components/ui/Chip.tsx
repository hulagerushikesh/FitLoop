import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Theme, useTheme, useThemedStyles } from '../../theme';
import { tapHaptic } from '../../utils/haptics';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  /** Override dot/icon color, e.g. recovery status colors. */
  accentColor?: string;
  style?: ViewStyle;
}

export default function Chip({ label, selected, onPress, icon: Icon, accentColor, style }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const fg = selected ? theme.colors.onAccent : (accentColor ?? theme.colors.textSecondary);

  return (
    <Pressable
      style={[styles.chip, selected && styles.selected, style]}
      onPress={
        onPress
          ? () => {
              tapHaptic();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {Icon ? <Icon size={14} color={fg} /> : null}
      <Text style={[styles.text, { color: selected ? theme.colors.onAccent : theme.colors.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs,
      borderRadius: t.radii.full,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surface,
      paddingHorizontal: t.spacing.md,
      minHeight: 36,
      paddingVertical: t.spacing.xs,
    },
    selected: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
    text: { ...t.typography.bodySmall, fontFamily: t.typography.bodyBold.fontFamily },
  });
}
