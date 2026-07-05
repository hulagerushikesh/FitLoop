import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Theme, useTheme, useThemedStyles } from '../../theme';
import Card from './Card';
import CountUp from './CountUp';

interface Props {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  icon?: LucideIcon;
  iconColor?: string;
  animate?: boolean;
  style?: ViewStyle;
}

export default function StatCard({
  label,
  value,
  suffix = '',
  decimals = 0,
  icon: Icon,
  iconColor,
  animate = true,
  style,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Card style={{ ...styles.card, ...style }}>
      {Icon ? (
        <View style={styles.iconWrap}>
          <Icon size={18} color={iconColor ?? theme.colors.accentEmphasis} />
        </View>
      ) : null}
      {animate ? (
        <CountUp value={value} suffix={suffix} decimals={decimals} style={styles.value} />
      ) : (
        <Text style={styles.value}>
          {value.toFixed(decimals)}
          {suffix}
        </Text>
      )}
      <Text style={styles.label}>{label}</Text>
    </Card>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    card: { flex: 1, alignItems: 'flex-start', gap: t.spacing.xs },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: t.radii.md,
      backgroundColor: t.colors.accentMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.spacing.xs,
    },
    value: { ...t.typography.stat, color: t.colors.textPrimary },
    label: { ...t.typography.caption, color: t.colors.textSecondary },
  });
}
