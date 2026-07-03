import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/theme';

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
  return (
    <View>
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <Pressable
            key={opt.value}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onSelect(opt.value)}
          >
            <View style={styles.textColumn}>
              <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
              {opt.description ? (
                <Text style={[styles.description, active && styles.descriptionActive]}>
                  {opt.description}
                </Text>
              ) : null}
            </View>
            {active ? <Ionicons name="checkmark-circle" size={22} color={COLORS.accent} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  optionActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentMuted },
  textColumn: { flex: 1 },
  label: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary },
  labelActive: { color: COLORS.accent },
  description: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
  descriptionActive: { color: COLORS.textPrimary },
});
