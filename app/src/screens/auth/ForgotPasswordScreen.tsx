import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyRound, Mail } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import ScreenContainer from '../../components/ScreenContainer';
import TextField from '../../components/TextField';
import { Button } from '../../components/ui';
import { Theme, useTheme, useThemedStyles } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const { error: err } = await resetPassword(email.trim());
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setSent(true);
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <View style={styles.logoBadge}>
              <KeyRound size={28} color={t.colors.onAccent} />
            </View>
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.subtitle}>
              {sent
                ? `Check ${email.trim()} for a reset link, then come back here to log in.`
                : "Enter your email and we'll send you a reset link."}
            </Text>
          </View>

          {!sent ? (
            <>
              <TextField
                label="Email"
                icon={Mail}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button
                label="Send reset link"
                onPress={onSubmit}
                loading={submitting}
                disabled={!email.trim()}
                style={styles.submitButton}
              />
            </>
          ) : null}

          <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={styles.linkText}>
              Back to <Text style={styles.linkAccent}>Log in</Text>
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
    title: { ...t.typography.h1, color: t.colors.textPrimary },
    subtitle: {
      ...t.typography.body,
      color: t.colors.textSecondary,
      marginTop: t.spacing.sm,
      textAlign: 'center',
    },
    submitButton: { marginTop: t.spacing.sm },
    linkRow: { marginTop: t.spacing.xxl, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
    linkText: { ...t.typography.body, color: t.colors.textSecondary },
    linkAccent: { color: t.colors.accentEmphasis, fontFamily: t.typography.bodyBold.fontFamily },
    error: { color: t.colors.danger, marginBottom: t.spacing.sm, ...t.typography.caption },
  });
}
