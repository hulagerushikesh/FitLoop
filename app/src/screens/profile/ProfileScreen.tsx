import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart3, Calendar, ChevronRight } from "lucide-react-native";
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { updateProfile, fetchLatestWeight, logWeight } from '../../services/profile';
import { fetchLatestGoal } from '../../services/goals';
import OptionPicker from '../../components/OptionPicker';
import Stepper from '../../components/Stepper';
import TextField from '../../components/TextField';
import { Button, Card, Chip } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import {
  SEX_OPTIONS,
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  RATE_BOUNDS,
  formatRate,
} from '../../constants/profileOptions';
import { FONTS, Theme, useTheme, useThemeMode, useThemedStyles } from '../../theme';
import type { ActivityLevel, GoalType, Goal, Sex } from '../../types/database';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

export default function ProfileScreen({ navigation }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user, signOut } = useAuth();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();
  const { profile, refresh } = useProfile();

  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [sex, setSex] = useState<Sex | undefined>();
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | undefined>();
  const [goalType, setGoalType] = useState<GoalType | undefined>();
  const [rate, setRate] = useState(0);
  const [weightKg, setWeightKg] = useState('');
  const [loadingWeight, setLoadingWeight] = useState(true);
  const [latestGoal, setLatestGoal] = useState<Goal | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setAge(profile.age?.toString() ?? '');
    setHeightCm(profile.height_cm?.toString() ?? '');
    setSex(profile.sex ?? undefined);
    setActivityLevel(profile.activity_level ?? undefined);
    setGoalType(profile.goal_type ?? undefined);
    setRate(profile.target_rate_kg_per_week ?? 0);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    fetchLatestWeight(user.id)
      .then((w) => setWeightKg(w?.toString() ?? ''))
      .finally(() => setLoadingWeight(false));
    fetchLatestGoal(user.id).then(setLatestGoal);
  }, [user]);

  const bounds = goalType ? RATE_BOUNDS[goalType] : null;

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile(user.id, {
        age: age ? Number(age) : null,
        height_cm: heightCm ? Number(heightCm) : null,
        sex: sex ?? null,
        activity_level: activityLevel ?? null,
        goal_type: goalType ?? null,
        target_rate_kg_per_week: goalType === 'maintenance' ? 0 : rate,
      });
      if (weightKg) {
        await logWeight(user.id, Number(weightKg));
      }
      await refresh();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.email}>{user?.email}</Text>

          {latestGoal ? (
            <Card style={styles.targetCard} highlighted>
              <Text style={styles.targetLabel}>Your target</Text>
              <Text style={styles.targetCalories}>{latestGoal.calorie_target} kcal/day</Text>
              <Text style={styles.targetMacros}>
                {latestGoal.protein_g}g protein · {latestGoal.carbs_g}g carbs · {latestGoal.fat_g}g fat
              </Text>
              {latestGoal.reason ? <Text style={styles.targetReason}>{latestGoal.reason}</Text> : null}
            </Card>
          ) : null}

          <Card style={styles.menuCard}>
            <Pressable
              style={styles.menuRow}
              onPress={() => navigation.navigate('CalendarMain')}
            >
              <View style={styles.menuIconWrap}>
                <Calendar size={18} color={t.colors.accentEmphasis} />
              </View>
              <Text style={styles.menuLabel}>Calendar</Text>
              <ChevronRight size={18} color={t.colors.textTertiary} />
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable
              style={styles.menuRow}
              onPress={() => navigation.navigate('AnalyticsMain')}
            >
              <View style={styles.menuIconWrap}>
                <BarChart3 size={18} color={t.colors.accentEmphasis} />
              </View>
              <Text style={styles.menuLabel}>Analytics</Text>
              <ChevronRight size={18} color={t.colors.textTertiary} />
            </Pressable>
          </Card>

          <Text style={styles.section}>Appearance</Text>
          <View style={styles.themeRow}>
            {(['system', 'light', 'dark'] as const).map((m) => (
              <Chip
                key={m}
                label={m === 'system' ? 'Auto' : m === 'light' ? 'Light' : 'Dark'}
                selected={themeMode === m}
                onPress={() => setThemeMode(m)}
                style={styles.themeChip}
              />
            ))}
          </View>

          <Text style={styles.section}>Basics</Text>
          <Text style={styles.label}>Sex</Text>
          <OptionPicker options={SEX_OPTIONS} selected={sex} onSelect={setSex} />
          <TextField label="Age" keyboardType="number-pad" value={age} onChangeText={setAge} />
          <TextField label="Height (cm)" keyboardType="decimal-pad" value={heightCm} onChangeText={setHeightCm} />
          <Text style={styles.label}>Current weight (kg)</Text>
          {loadingWeight ? (
            <ActivityIndicator color={t.colors.accentEmphasis} />
          ) : (
            <TextField keyboardType="decimal-pad" value={weightKg} onChangeText={setWeightKg} />
          )}

          <Text style={styles.section}>Activity level</Text>
          <OptionPicker options={ACTIVITY_OPTIONS} selected={activityLevel} onSelect={setActivityLevel} />

          <Text style={styles.section}>Goal</Text>
          <OptionPicker
            options={GOAL_OPTIONS}
            selected={goalType}
            onSelect={(v) => {
              setGoalType(v);
              setRate(RATE_BOUNDS[v].default);
            }}
          />
          {bounds && goalType !== 'maintenance' ? (
            <Stepper value={rate} min={bounds.min} max={bounds.max} step={0.1} onChange={setRate} format={formatRate} />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {saved ? <Text style={styles.success}>Saved!</Text> : null}

          <Button label="Save changes" onPress={onSave} loading={saving} style={styles.saveButton} />
          <Button label="Log Out" onPress={signOut} variant="destructive" style={styles.logoutButton} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: t.spacing.xxl },
  email: { ...t.typography.caption, color: t.colors.textSecondary, marginBottom: t.spacing.lg },
  targetCard: { marginBottom: t.spacing.lg },
  targetLabel: { ...t.typography.label, color: t.colors.textSecondary, textTransform: 'uppercase' },
  targetCalories: { fontSize: 28, fontFamily: FONTS.extrabold, color: t.colors.accentEmphasis, marginTop: t.spacing.xs },
  targetMacros: { ...t.typography.body, color: t.colors.textPrimary, marginTop: t.spacing.xs },
  targetReason: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: t.spacing.sm, fontStyle: 'italic' },
  menuCard: { padding: 0, marginBottom: t.spacing.lg, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: t.spacing.md + 2, paddingHorizontal: t.spacing.lg, gap: t.spacing.md },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { ...t.typography.bodyBold, color: t.colors.textPrimary, flex: 1 },
  menuDivider: { height: 1, backgroundColor: t.colors.border, marginLeft: t.spacing.lg + 34 + t.spacing.md },
  themeRow: { flexDirection: 'row', gap: t.spacing.sm },
  themeChip: { flex: 1, justifyContent: 'center' },
  section: { ...t.typography.h3, color: t.colors.textPrimary, marginTop: t.spacing.xl, marginBottom: t.spacing.md },
  label: { ...t.typography.label, color: t.colors.textSecondary, marginBottom: t.spacing.sm, marginTop: t.spacing.md, textTransform: 'uppercase' },
  saveButton: { marginTop: t.spacing.xl },
  logoutButton: { marginTop: t.spacing.md, marginBottom: 40 },
  error: { color: t.colors.danger, marginTop: t.spacing.lg, textAlign: 'center', ...t.typography.caption },
  success: { color: t.colors.success, marginTop: t.spacing.lg, textAlign: 'center', ...t.typography.caption },
});
}
