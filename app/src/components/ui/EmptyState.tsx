import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Theme, useTheme, useThemedStyles } from '../../theme';
import Button from './Button';

interface Props {
  icon: LucideIcon;
  title: string;
  message?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  style?: ViewStyle;
}

export default function EmptyState({
  icon: Icon,
  title,
  message,
  ctaLabel,
  onCtaPress,
  style,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconBadge}>
        <Icon size={28} color={theme.colors.accentEmphasis} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {ctaLabel && onCtaPress ? (
        <Button label={ctaLabel} onPress={onCtaPress} size="sm" style={styles.cta} />
      ) : null}
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', paddingVertical: t.spacing.xxl, paddingHorizontal: t.spacing.xl },
    iconBadge: {
      width: 64,
      height: 64,
      borderRadius: t.radii.xl,
      backgroundColor: t.colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.spacing.lg,
    },
    title: { ...t.typography.h3, color: t.colors.textPrimary, textAlign: 'center' },
    message: {
      ...t.typography.body,
      color: t.colors.textSecondary,
      textAlign: 'center',
      marginTop: t.spacing.sm,
    },
    cta: { marginTop: t.spacing.lg },
  });
}
