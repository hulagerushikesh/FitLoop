import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Theme, useTheme, useThemedStyles } from '../theme';
import { tapHaptic } from '../utils/haptics';

interface Props {
  icon: LucideIcon;
  label: string;
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
}

/** Settings-style list row: icon badge, label, chevron. 44px+ tap target. */
export default function MenuRow({ icon: Icon, label, detail, onPress, destructive }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const tint = destructive ? theme.colors.danger : theme.colors.accentEmphasis;

  return (
    <Pressable
      style={styles.row}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.iconWrap, destructive && styles.iconWrapDestructive]}>
        <Icon size={18} color={tint} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.label, destructive && { color: theme.colors.danger }]}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      <ChevronRight size={18} color={theme.colors.textTertiary} />
    </Pressable>
  );
}

export function MenuDivider() {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.divider} />;
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: t.spacing.md,
      paddingHorizontal: t.spacing.lg,
      gap: t.spacing.md,
      minHeight: 56,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: t.radii.md,
      backgroundColor: t.colors.accentMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapDestructive: { backgroundColor: t.colors.dangerMuted },
    textCol: { flex: 1 },
    label: { ...t.typography.bodyBold, color: t.colors.textPrimary },
    detail: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: 2 },
    divider: { height: 1, backgroundColor: t.colors.border, marginLeft: t.spacing.lg + 34 + t.spacing.md },
  });
}
