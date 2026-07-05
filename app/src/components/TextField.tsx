import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Theme, useTheme, useThemedStyles } from '../theme';

interface Props {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: LucideIcon;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
}

export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  icon: Icon,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'sentences',
  multiline,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          multiline && styles.inputRowMultiline,
          focused && styles.inputRowFocused,
        ]}
      >
        {Icon ? <Icon size={18} color={theme.colors.textTertiary} style={styles.icon} /> : null}
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: { marginBottom: t.spacing.md },
    label: { ...t.typography.label, color: t.colors.textSecondary, marginBottom: t.spacing.sm },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.surface,
      borderWidth: 1.5,
      borderColor: t.colors.border,
      borderRadius: t.radii.md,
      paddingHorizontal: t.spacing.lg,
    },
    inputRowMultiline: { alignItems: 'flex-start', paddingVertical: t.spacing.sm },
    inputRowFocused: { borderColor: t.colors.accent },
    icon: { marginRight: t.spacing.sm },
    input: {
      flex: 1,
      paddingVertical: t.spacing.md,
      minHeight: 50,
      ...t.typography.body,
      color: t.colors.textPrimary,
    },
    inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  });
}
