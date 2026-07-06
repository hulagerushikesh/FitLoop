import React, { useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text } from 'react-native';
import { FileJson, FileSpreadsheet } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import MenuRow from '../../components/MenuRow';
import { Card, useToast } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { toCsv } from '../../utils/csv';
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

/** Flat CSV of every logged set (date, exercise, set, weight, reps, rpe). */
async function fetchWorkoutSetsCsv(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('logged_at, set_number, weight_kg, reps, rpe, set_type, exercise:exercises(name)')
    .eq('user_id', userId)
    .order('logged_at', { ascending: true })
    .limit(10000);
  if (error) throw error;
  const rows = ((data ?? []) as unknown as {
    logged_at: string;
    set_number: number;
    weight_kg: number | null;
    reps: number | null;
    rpe: number | null;
    set_type: string;
    exercise: { name: string } | null;
  }[]).map((r) => [
    r.logged_at.slice(0, 10),
    r.exercise?.name ?? '',
    r.set_number,
    r.weight_kg,
    r.reps,
    r.rpe,
    r.set_type,
  ]);
  return toCsv(['date', 'exercise', 'set', 'weight_kg', 'reps', 'rpe', 'set_type'], rows);
}

/** Flat CSV of every food log (date, meal, name, calories, macros). */
async function fetchFoodLogsCsv(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('logged_date, meal_type, name, servings, calories, protein_g, carbs_g, fat_g, source')
    .eq('user_id', userId)
    .order('logged_date', { ascending: true })
    .limit(10000);
  if (error) throw error;
  const rows = (data ?? []).map((r) => [
    r.logged_date,
    r.meal_type,
    r.name,
    r.servings,
    r.calories,
    r.protein_g,
    r.carbs_g,
    r.fat_g,
    r.source,
  ]);
  return toCsv(
    ['date', 'meal', 'name', 'servings', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'source'],
    rows
  );
}

export default function DataExportScreen() {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const { showToast } = useToast();
  const [exporting, setExporting] = useState<string | null>(null);

  // Web downloads a file; native shares the text (Share sheet → Files/Mail/etc).
  const deliver = async (content: string, filename: string, mime: string) => {
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      await Share.share({ message: content, title: filename });
    }
  };

  const runExport = async (
    key: string,
    build: () => Promise<{ content: string; filename: string; mime: string }>
  ) => {
    if (!user || exporting) return;
    setExporting(key);
    try {
      const { content, filename, mime } = await build();
      await deliver(content, filename, mime);
      showToast('Data exported');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setExporting(null);
    }
  };

  const stamp = () => new Date().toISOString().slice(0, 10);

  const onExportJson = () =>
    runExport('json', async () => ({
      content: JSON.stringify(await fetchAllUserData(user!.id), null, 2),
      filename: `fitloop-export-${stamp()}.json`,
      mime: 'application/json',
    }));

  const onExportWorkoutsCsv = () =>
    runExport('workouts', async () => ({
      content: await fetchWorkoutSetsCsv(user!.id),
      filename: `fitloop-workouts-${stamp()}.csv`,
      mime: 'text/csv',
    }));

  const onExportFoodCsv = () =>
    runExport('food', async () => ({
      content: await fetchFoodLogsCsv(user!.id),
      filename: `fitloop-food-${stamp()}.csv`,
      mime: 'text/csv',
    }));

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
            label={exporting === 'json' ? 'Exporting…' : 'Export as JSON'}
            detail="All your FitLoop data in one file"
            onPress={onExportJson}
          />
          <MenuRow
            icon={FileSpreadsheet}
            label={exporting === 'workouts' ? 'Exporting…' : 'Workout sets (CSV)'}
            detail="Every logged set — date, exercise, weight, reps"
            onPress={onExportWorkoutsCsv}
          />
          <MenuRow
            icon={FileSpreadsheet}
            label={exporting === 'food' ? 'Exporting…' : 'Food logs (CSV)'}
            detail="Every meal — calories and macros by day"
            onPress={onExportFoodCsv}
          />
        </Card>
        <Text style={styles.footnote}>
          CSV files open in Excel, Numbers, or Google Sheets. On mobile, use the share sheet to save
          or send them.
        </Text>
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
