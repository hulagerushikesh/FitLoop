import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Theme, useTheme, useThemedStyles } from '../../theme';

interface Props {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | null;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  editable?: boolean;
  style?: ViewStyle;
}

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  multiline,
  editable = true,
  style,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.errored,
          !editable && styles.disabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    wrap: { marginBottom: t.spacing.md },
    label: { ...t.typography.label, color: t.colors.textSecondary, marginBottom: t.spacing.sm },
    input: {
      borderWidth: 1.5,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surface,
      borderRadius: t.radii.md,
      paddingHorizontal: t.spacing.lg,
      paddingVertical: t.spacing.md,
      minHeight: 52,
      ...t.typography.body,
      color: t.colors.textPrimary,
    },
    multiline: { minHeight: 96, textAlignVertical: 'top' },
    focused: { borderColor: t.colors.accent },
    errored: { borderColor: t.colors.danger },
    disabled: { opacity: 0.5 },
    error: { ...t.typography.caption, color: t.colors.danger, marginTop: t.spacing.xs },
  });
}
