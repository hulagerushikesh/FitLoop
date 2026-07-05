import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Flame, Lock, Mail } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import ScreenContainer from '../../components/ScreenContainer';
import TextField from '../../components/TextField';
import { Button } from '../../components/ui';
import { Theme, useTheme, useThemedStyles } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    const { error } = await signUp(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setError(error);
    } else {
      setInfo('Check your email to confirm your account, then log in.');
    }
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
              <Flame size={28} color={t.colors.onAccent} />
            </View>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Start your FitLoop journey</Text>
          </View>

          <TextField
            label="Email"
            icon={Mail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Password"
            icon={Lock}
            placeholder="min. 6 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}

          <Button
            label="Sign Up"
            onPress={onSubmit}
            loading={submitting}
            disabled={!email || password.length < 6}
            style={styles.submitButton}
          />

          <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkAccent}>Log in</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: t.spacing.xxl },
  brand: { alignItems: 'center', marginBottom: t.spacing.xxxl },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.lg,
  },
  title: { ...t.typography.h1, color: t.colors.textPrimary },
  subtitle: { ...t.typography.body, color: t.colors.textSecondary, marginTop: t.spacing.xs },
  submitButton: { marginTop: t.spacing.sm },
  linkRow: { marginTop: t.spacing.xxl, alignItems: 'center' },
  linkText: { ...t.typography.body, color: t.colors.textSecondary },
  linkAccent: { color: t.colors.accentEmphasis, fontFamily: t.typography.bodyBold.fontFamily },
  error: { color: t.colors.danger, marginBottom: t.spacing.sm, ...t.typography.caption },
  info: { color: t.colors.success, marginBottom: t.spacing.sm, ...t.typography.caption },
});
}
