import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Card } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { Theme, useTheme, useThemedStyles } from '../../theme';

const PRIVACY_TEXT = `Last updated: July 2026

WHAT WE COLLECT
• Account: your email address (for sign-in) via our authentication provider.
• Profile & health data you enter: age, sex, height, weight, body measurements, activity level, and goals.
• Activity data you log: workouts, sets, food logs, water, progress photos, and achievements.

HOW WE USE IT
Your data is used only to run the app for you — to calculate calorie and macro targets, track progress, and show your history. We do not use it for advertising and we do not sell it.

THIRD PARTIES
• Supabase (database, authentication, and file storage) hosts your data on your behalf.
• Google Gemini API: when you use AI meal logging, the meal photo or description you submit is sent to Google solely to estimate nutrition, and is not used to build advertising profiles. Don't submit photos containing anything you wouldn't want processed by a third-party API.
We share data with no one else.

STORAGE, RETENTION & SECURITY
Your data is stored in a private account protected by row-level security, so only you can read or write it. It is retained until you delete it. Deleting your account (Settings → Account) permanently removes all of your stored data.

YOUR RIGHTS
You can view, edit, export (Settings → Data, as JSON or CSV), and permanently delete your data at any time from within the app.

CONTACT
Questions or requests: hulagerushikesh@gmail.com`;

const TERMS_TEXT = `Last updated: July 2026

1. WHAT FITLOOP IS
FitLoop provides calorie, macro, and training estimates for general fitness and informational purposes.

2. NOT MEDICAL ADVICE
The estimates and suggestions in this app are not medical, nutritional, or professional advice. Consult a qualified professional before making significant changes to your diet or training, especially if you have any medical condition, are pregnant, or have a history of disordered eating. You use the app's guidance at your own risk.

3. YOUR RESPONSIBILITIES
You are responsible for the accuracy of the data you enter and for using the app safely. You must be at least 16 years old (or the age of digital consent in your region) to use FitLoop.

4. YOUR CONTENT
You retain ownership of the data and photos you submit. You grant FitLoop permission to store and process that content only to provide the app's features to you.

5. AVAILABILITY & LIABILITY
The app is provided "as is," without warranties. To the extent permitted by law, FitLoop is not liable for any loss or injury arising from use of the app or reliance on its estimates.

6. CHANGES
These terms may be updated; continued use after an update constitutes acceptance. Contact: hulagerushikesh@gmail.com`;

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
