import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import TextField from '../../components/TextField';
import { Button, useToast } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { Theme, useThemedStyles } from '../../theme';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ChangePassword'>;

export default function ChangePasswordScreen({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const { updatePassword } = useAuth();
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
    showToast('Password updated');
    navigation.goBack();
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Choose a new password (at least 6 characters).
        </Text>
        <TextField
          label="New password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
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
        <Button label="Update password" onPress={onSave} disabled={!valid} loading={saving} style={styles.button} />
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: { padding: t.spacing.xl },
    hint: { ...t.typography.body, color: t.colors.textSecondary, marginBottom: t.spacing.xl },
    error: { ...t.typography.caption, color: t.colors.danger, marginBottom: t.spacing.md },
    button: { marginTop: t.spacing.md },
  });
}
