import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../theme/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  highlighted?: boolean;
}

export default function Card({ children, style, highlighted }: Props) {
  return <View style={[styles.card, highlighted && styles.highlighted, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  highlighted: {
    borderColor: COLORS.accent,
  },
});
