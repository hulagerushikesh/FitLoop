import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import ScreenContainer from '../../components/ScreenContainer';
import TextField from '../../components/TextField';
import { Button, useToast } from '../../components/ui';
import { Theme, useTheme, useThemedStyles } from '../../theme';

/**
 * Shown by RootNavigator when the user arrives via a password-recovery
 * link (Supabase PASSWORD_RECOVERY event) — sets the new password on the
 * recovery session, then drops back into the normal app flow.
 */
export default function NewPasswordScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { updatePassword, clearPasswordRecovery } = useAuth();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = password.length >= 6 && password === confirmPassword;

  const onSave = async () => {
    setSaving(true);
    setError(null);
    const { error: err } = await updatePassword(password);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    showToast('Password updated — welcome back');
    clearPasswordRecovery();
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <View style={styles.logoBadge}>
              <ShieldCheck size={28} color={t.colors.onAccent} />
            </View>
            <Text style={styles.title}>Set a new password</Text>
            <Text style={styles.subtitle}>You're signed in via your recovery link — pick a new password.</Text>
          </View>

          <TextField
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="min. 6 characters"
          />
          <TextField
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          {password && confirmPassword && password !== confirmPassword ? (
            <Text style={styles.error}>Passwords don't match.</Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Save new password" onPress={onSave} disabled={!valid} loading={saving} style={styles.button} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    flex: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', padding: t.spacing.xl },
    brand: { alignItems: 'center', marginBottom: t.spacing.xxl },
    logoBadge: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: t.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.spacing.lg,
    },
    title: { ...t.typography.h1, color: t.colors.textPrimary, textAlign: 'center' },
    subtitle: {
      ...t.typography.body,
      color: t.colors.textSecondary,
      marginTop: t.spacing.sm,
      textAlign: 'center',
    },
    button: { marginTop: t.spacing.sm },
    error: { color: t.colors.danger, marginBottom: t.spacing.sm, ...t.typography.caption },
  });
}
