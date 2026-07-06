import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Card } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { Theme, useTheme, useThemedStyles } from '../../theme';

const PRIVACY_TEXT = `FitLoop stores the data you enter — profile details, body measurements, workout logs, and food logs — in a private database account only you can access. Meal photos and descriptions you submit for AI analysis are sent to Google's Gemini API solely to estimate nutrition and are not used to build advertising profiles. Your data is never sold. You can export everything from Settings → Data, and deleting your account permanently removes all stored data.

This is a summary, not a legal document — a full policy will ship with the public release.`;

const TERMS_TEXT = `FitLoop provides calorie, macro, and training estimates for general fitness purposes. These are informational estimates, not medical advice — consult a professional before making significant changes to diet or training, especially with any medical condition. You are responsible for the accuracy of the data you log. The app is provided as-is during this pre-release period.`;

function Expandable({ title, body }: { title: string; body: string }) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const Icon = open ? ChevronUp : ChevronDown;
  return (
    <Card style={styles.expandCard}>
      <Pressable style={styles.expandHeader} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.expandTitle}>{title}</Text>
        <Icon size={18} color={t.colors.textTertiary} />
      </Pressable>
      {open ? <Text style={styles.expandBody}>{body}</Text> : null}
    </Card>
  );
}

export default function AboutScreen() {
  const styles = useThemedStyles(createStyles);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.appName}>FitLoop</Text>
          <Text style={styles.version}>Version {version}</Text>
        </View>
        <Expandable title="Privacy policy" body={PRIVACY_TEXT} />
        <Expandable title="Terms of use" body={TERMS_TEXT} />
        <Text style={styles.footnote}>Built with Expo, Supabase, and too many rest-day snacks.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: { padding: t.spacing.xl },
    header: { alignItems: 'center', marginBottom: t.spacing.xl },
    appName: { ...t.typography.h1, color: t.colors.textPrimary },
    version: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: t.spacing.xs },
    expandCard: { marginBottom: t.spacing.md },
    expandHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    expandTitle: { ...t.typography.h3, color: t.colors.textPrimary },
    expandBody: { ...t.typography.body, color: t.colors.textSecondary, marginTop: t.spacing.md },
    footnote: {
      ...t.typography.caption,
      color: t.colors.textTertiary,
      textAlign: 'center',
      marginTop: t.spacing.xl,
    },
  });
}
