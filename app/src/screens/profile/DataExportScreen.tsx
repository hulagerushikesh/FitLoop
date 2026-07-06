import React, { useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text } from 'react-native';
import { FileJson } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import MenuRow from '../../components/MenuRow';
import { Card, useToast } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { Theme, useThemedStyles } from '../../theme';

async function fetchAllUserData(userId: string) {
  const [profile, goals, bodyMetrics, workouts, sessions, workoutLogs, foodLogs, meals] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('goals').select('*').eq('user_id', userId),
      supabase.from('body_metrics').select('*').eq('user_id', userId),
      supabase.from('workouts').select('*, workout_exercises(*, exercise:exercises(name))').eq('user_id', userId),
      supabase.from('workout_sessions').select('*').eq('user_id', userId),
      supabase.from('workout_logs').select('*').eq('user_id', userId),
      supabase.from('food_logs').select('*').eq('user_id', userId),
      supabase.from('meals').select('*').eq('user_id', userId),
    ]);

  return {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    goals: goals.data ?? [],
    body_metrics: bodyMetrics.data ?? [],
    routines: workouts.data ?? [],
    workout_sessions: sessions.data ?? [],
    workout_sets: workoutLogs.data ?? [],
    food_logs: foodLogs.data ?? [],
    saved_meals: meals.data ?? [],
  };
}

export default function DataExportScreen() {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const onExportJson = async () => {
    if (!user || exporting) return;
    setExporting(true);
    try {
      const data = await fetchAllUserData(user.id);
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web') {
        // Share API is unreliable on web — download a file instead.
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fitloop-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: json, title: 'FitLoop data export' });
      }
      showToast('Data exported');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.hint}>
          Your data belongs to you. Export everything — profile, goals, weight history, routines,
          logged sets, and food logs — as a single JSON file.
        </Text>
        <Card style={styles.menuCard}>
          <MenuRow
            icon={FileJson}
            label={exporting ? 'Exporting…' : 'Export as JSON'}
            detail="All your FitLoop data in one file"
            onPress={onExportJson}
          />
        </Card>
        <Text style={styles.footnote}>CSV export for workout and food logs is coming with the analytics update.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: { padding: t.spacing.xl },
    hint: { ...t.typography.body, color: t.colors.textSecondary, marginBottom: t.spacing.xl },
    menuCard: { padding: 0, overflow: 'hidden' },
    footnote: { ...t.typography.caption, color: t.colors.textTertiary, marginTop: t.spacing.md },
  });
}
