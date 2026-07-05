import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Theme, useTheme, useThemedStyles } from '../../theme';
import { tapHaptic } from '../../utils/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'md' | 'sm';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  style?: ViewStyle;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon: Icon,
  style,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const contentColor =
    variant === 'primary'
      ? theme.colors.onAccent
      : variant === 'destructive'
        ? theme.colors.danger
        : variant === 'ghost'
          ? theme.colors.accentEmphasis
          : theme.colors.textPrimary;

  const pressIn = () =>
    Animated.timing(scale, { toValue: 0.97, duration: 90, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        style={[styles.base, styles[size], styles[variant], isDisabled && styles.disabled]}
        onPress={() => {
          tapHaptic();
          onPress();
        }}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {loading ? (
          <ActivityIndicator color={contentColor} />
        ) : (
          <>
            {Icon ? <Icon size={size === 'sm' ? 16 : 18} color={contentColor} /> : null}
            <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: contentColor }]}>
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing.sm,
      borderRadius: t.radii.full,
    },
    md: { minHeight: 52, paddingHorizontal: t.spacing.xl, paddingVertical: t.spacing.md },
    sm: { minHeight: 44, paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.sm },
    primary: { backgroundColor: t.colors.accent },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: t.colors.border,
    },
    ghost: { backgroundColor: 'transparent' },
    destructive: { backgroundColor: t.colors.dangerMuted },
    disabled: { opacity: 0.4 },
    label: { ...t.typography.bodyBold },
    labelSm: { ...t.typography.bodySmall, fontFamily: t.typography.bodyBold.fontFamily },
  });
}
