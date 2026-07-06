import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useUnits } from '../../hooks/useUnits';
import { updateProfile, fetchLatestWeight, logWeight } from '../../services/profile';
import OptionPicker from '../../components/OptionPicker';
import Stepper from '../../components/Stepper';
import TextField from '../../components/TextField';
import { Button, useToast } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import {
  SEX_OPTIONS,
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  RATE_BOUNDS,
  formatRate,
} from '../../constants/profileOptions';
import { Theme, useTheme, useThemedStyles } from '../../theme';
import type { ActivityLevel, GoalType, Sex } from '../../types/database';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const { profile, refresh } = useProfile();
  const units = useUnits();
  const { showToast } = useToast();

  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [sex, setSex] = useState<Sex | undefined>();
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | undefined>();
  const [goalType, setGoalType] = useState<GoalType | undefined>();
  const [rate, setRate] = useState(0);
  const [weight, setWeight] = useState('');
  const [loadingWeight, setLoadingWeight] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setAge(profile.age?.toString() ?? '');
    setHeight(profile.height_cm != null ? String(units.displayHeight(profile.height_cm)) : '');
    setSex(profile.sex ?? undefined);
    setActivityLevel(profile.activity_level ?? undefined);
    setGoalType(profile.goal_type ?? undefined);
    setRate(profile.target_rate_kg_per_week ?? 0);
    // units is derived from profile.unit_system, so profile covers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    fetchLatestWeight(user.id)
      .then((w) => setWeight(w != null ? String(units.displayWeight(w)) : ''))
      .finally(() => setLoadingWeight(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const bounds = goalType ? RATE_BOUNDS[goalType] : null;

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(user.id, {
        age: age ? Number(age) : null,
        height_cm: height ? units.parseHeight(Number(height)) : null,
        sex: sex ?? null,
        activity_level: activityLevel ?? null,
        goal_type: goalType ?? null,
        target_rate_kg_per_week: goalType === 'maintenance' ? 0 : rate,
      });
      if (weight) {
        await logWeight(user.id, units.parseWeight(Number(weight)));
      }
      await refresh();
      showToast('Profile saved');
      navigation.goBack();
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
          <Text style={styles.section}>Basics</Text>
          <Text style={styles.label}>Sex</Text>
          <OptionPicker options={SEX_OPTIONS} selected={sex} onSelect={setSex} />
          <TextField label="Age" keyboardType="number-pad" value={age} onChangeText={setAge} />
          <TextField
            label={`Height (${units.heightUnit})`}
            keyboardType="decimal-pad"
            value={height}
            onChangeText={setHeight}
          />
          <Text style={styles.label}>Current weight ({units.weightUnit})</Text>
          {loadingWeight ? (
            <ActivityIndicator color={t.colors.accentEmphasis} />
          ) : (
            <TextField keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
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

          <Button label="Save changes" onPress={onSave} loading={saving} style={styles.saveButton} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: { flexGrow: 1, padding: t.spacing.xl, paddingBottom: t.spacing.xxxl },
    section: { ...t.typography.h3, color: t.colors.textPrimary, marginTop: t.spacing.xl, marginBottom: t.spacing.md },
    label: { ...t.typography.label, color: t.colors.textSecondary, marginBottom: t.spacing.sm, marginTop: t.spacing.md },
    saveButton: { marginTop: t.spacing.xl, marginBottom: t.spacing.xxl },
    error: { color: t.colors.danger, marginTop: t.spacing.lg, textAlign: 'center', ...t.typography.caption },
  });
}
