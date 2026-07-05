import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Theme, useTheme, useThemedStyles } from '../../theme';

type Tone = 'neutral' | 'accent' | 'energy' | 'success' | 'danger';

interface Props {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
}

export default function Badge({ label, tone = 'neutral', style }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const tones: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: theme.colors.surfaceElevated, fg: theme.colors.textSecondary },
    accent: { bg: theme.colors.accent, fg: theme.colors.onAccent },
    energy: { bg: theme.colors.energyMuted, fg: theme.colors.energy },
    success: { bg: theme.colors.accentMuted, fg: theme.colors.success },
    danger: { bg: theme.colors.dangerMuted, fg: theme.colors.danger },
  };

  return (
    <View style={[styles.badge, { backgroundColor: tones[tone].bg }, style]}>
      <Text style={[styles.text, { color: tones[tone].fg }]}>{label}</Text>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    badge: {
      borderRadius: t.radii.full,
      paddingHorizontal: t.spacing.sm,
      paddingVertical: 3,
      alignSelf: 'flex-start',
    },
    text: {
      fontFamily: t.typography.label.fontFamily,
      fontSize: 10,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
  });
}
