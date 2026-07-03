import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import ScreenContainer from '../../components/ScreenContainer';
import TextField from '../../components/TextField';
import Button from '../../components/Button';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) setError(error);
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.brand}>
            <View style={styles.logoBadge}>
              <Ionicons name="barbell" size={28} color={COLORS.accentText} />
            </View>
            <Text style={styles.title}>FitLoop</Text>
            <Text style={styles.subtitle}>Log in to keep the streak going</Text>
          </View>

          <TextField
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Password"
            icon="lock-closed-outline"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Log In"
            onPress={onSubmit}
            loading={submitting}
            disabled={!email || !password}
            style={styles.submitButton}
          />

          <Pressable onPress={() => navigation.navigate('Signup')} style={styles.linkRow}>
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkAccent}>Sign up</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: SPACING.xxl },
  brand: { alignItems: 'center', marginBottom: SPACING.xxxl },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: { ...TYPOGRAPHY.display, color: COLORS.textPrimary },
  subtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: SPACING.xs },
  submitButton: { marginTop: SPACING.sm },
  linkRow: { marginTop: SPACING.xxl, alignItems: 'center' },
  linkText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  linkAccent: { color: COLORS.accent, fontWeight: '700' },
  error: { color: COLORS.danger, marginBottom: SPACING.sm, ...TYPOGRAPHY.caption },
});
