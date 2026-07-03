import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { updateProfile, fetchLatestWeight, logWeight } from '../../services/profile';
import { fetchLatestGoal } from '../../services/goals';
import OptionPicker from '../../components/OptionPicker';
import Stepper from '../../components/Stepper';
import TextField from '../../components/TextField';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ScreenContainer from '../../components/ScreenContainer';
import {
  SEX_OPTIONS,
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  RATE_BOUNDS,
  formatRate,
} from '../../constants/profileOptions';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme/theme';
import type { ActivityLevel, GoalType, Goal, Sex } from '../../types/database';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
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
                <Ionicons name="calendar" size={18} color={COLORS.accent} />
              </View>
              <Text style={styles.menuLabel}>Calendar</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable
              style={styles.menuRow}
              onPress={() => navigation.navigate('AnalyticsMain')}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name="stats-chart" size={18} color={COLORS.accent} />
              </View>
              <Text style={styles.menuLabel}>Analytics</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </Pressable>
          </Card>

          <Text style={styles.section}>Basics</Text>
          <Text style={styles.label}>Sex</Text>
          <OptionPicker options={SEX_OPTIONS} selected={sex} onSelect={setSex} />
          <TextField label="Age" keyboardType="number-pad" value={age} onChangeText={setAge} />
          <TextField label="Height (cm)" keyboardType="decimal-pad" value={heightCm} onChangeText={setHeightCm} />
          <Text style={styles.label}>Current weight (kg)</Text>
          {loadingWeight ? (
            <ActivityIndicator color={COLORS.accent} />
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
          <Button label="Log Out" onPress={signOut} variant="danger" style={styles.logoutButton} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: SPACING.xxl },
  email: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  targetCard: { marginBottom: SPACING.lg },
  targetLabel: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, textTransform: 'uppercase' },
  targetCalories: { fontSize: 28, fontWeight: '800', color: COLORS.accent, marginTop: SPACING.xs },
  targetMacros: { ...TYPOGRAPHY.body, color: COLORS.textPrimary, marginTop: SPACING.xs },
  targetReason: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: SPACING.sm, fontStyle: 'italic' },
  menuCard: { padding: 0, marginBottom: SPACING.lg, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md + 2, paddingHorizontal: SPACING.lg, gap: SPACING.md },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { ...TYPOGRAPHY.bodyBold, color: COLORS.textPrimary, flex: 1 },
  menuDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.lg + 34 + SPACING.md },
  section: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary, marginTop: SPACING.xl, marginBottom: SPACING.md },
  label: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.md, textTransform: 'uppercase' },
  saveButton: { marginTop: SPACING.xl },
  logoutButton: { marginTop: SPACING.md, marginBottom: 40 },
  error: { color: COLORS.danger, marginTop: SPACING.lg, textAlign: 'center', ...TYPOGRAPHY.caption },
  success: { color: COLORS.success, marginTop: SPACING.lg, textAlign: 'center', ...TYPOGRAPHY.caption },
});
