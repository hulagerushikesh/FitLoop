import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { Theme, useTheme, useThemedStyles } from '../theme';
import { tapHaptic } from '../utils/haptics';

export interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  selected?: T;
  onSelect: (value: T) => void;
}

export default function OptionPicker<T extends string>({
  options,
  selected,
  onSelect,
}: Props<T>) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View>
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <Pressable
            key={opt.value}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => {
              tapHaptic();
              onSelect(opt.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <View style={styles.textColumn}>
              <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
              {opt.description ? (
                <Text style={[styles.description, active && styles.descriptionActive]}>
                  {opt.description}
                </Text>
              ) : null}
            </View>
            {active ? <CheckCircle2 size={22} color={theme.colors.accentEmphasis} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.colors.surface,
      borderWidth: 1.5,
      borderColor: t.colors.border,
      borderRadius: t.radii.md,
      padding: t.spacing.lg,
      marginBottom: t.spacing.sm,
    },
    optionActive: { borderColor: t.colors.accent, backgroundColor: t.colors.accentMuted },
    textColumn: { flex: 1 },
    label: { ...t.typography.h3, color: t.colors.textPrimary },
    labelActive: { color: t.colors.accentEmphasis },
    description: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: 2 },
    descriptionActive: { color: t.colors.textPrimary },
  });
}
