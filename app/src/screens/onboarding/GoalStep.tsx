import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingDraft } from './OnboardingContext';
import OptionPicker from '../../components/OptionPicker';
import Stepper from '../../components/Stepper';
import { Button } from '../../components/ui';
import StepProgress from '../../components/StepProgress';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { completeOnboarding } from '../../services/profile';
import { insertGoal } from '../../services/goals';
import { seedStandardPlan } from '../../services/workouts';
import { computeInitialTargets } from '../../engine/calorieEngine';
import { GOAL_OPTIONS, RATE_BOUNDS, formatRate } from '../../constants/profileOptions';
import { Theme, useTheme, useThemedStyles } from '../../theme';
import type { GoalType } from '../../types/database';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Goal'>;

export default function GoalStep(_props: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { draft, update } = useOnboardingDraft();
  const { user } = useAuth();
  const { refresh } = useProfile();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSelectGoal = (value: GoalType) => {
    update({ goal_type: value, target_rate_kg_per_week: RATE_BOUNDS[value].default });
  };

  const bounds = draft.goal_type ? RATE_BOUNDS[draft.goal_type] : null;

  const canFinish =
    !!draft.goal_type &&
    draft.target_rate_kg_per_week !== undefined &&
    !!draft.age &&
    !!draft.height_cm &&
    !!draft.weight_kg &&
    !!draft.sex &&
    !!draft.activity_level;

  const onFinish = async () => {
    if (!user || !canFinish) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeOnboarding(user.id, {
        age: draft.age!,
        sex: draft.sex!,
        height_cm: draft.height_cm!,
        activity_level: draft.activity_level!,
        goal_type: draft.goal_type!,
        target_rate_kg_per_week: draft.target_rate_kg_per_week!,
        weight_kg: draft.weight_kg!,
        unit_system: draft.unit_system,
      });

      const targets = computeInitialTargets({
        sex: draft.sex!,
        weightKg: draft.weight_kg!,
        heightCm: draft.height_cm!,
        age: draft.age!,
        activityLevel: draft.activity_level!,
        goalType: draft.goal_type!,
      });
      await insertGoal(user.id, {
        calorie_target: targets.calories,
        protein_g: targets.protein_g,
        fat_g: targets.fat_g,
        carbs_g: targets.carbs_g,
        reason: 'Your initial target, based on your profile and goal.',
      });

      // A starter workout plan is a nice-to-have, not a blocker — if the
      // exercise library isn't seeded yet or this fails, still let the
      // user reach the app; they can build routines manually.
      try {
        await seedStandardPlan(user.id);
      } catch {
        // ignore
      }

      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <StepProgress step={3} total={3} />
        <Text style={styles.title}>What's your goal?</Text>
        <OptionPicker options={GOAL_OPTIONS} selected={draft.goal_type} onSelect={onSelectGoal} />

        {bounds && draft.goal_type !== 'maintenance' ? (
          <>
            <Text style={styles.label}>Target rate of change</Text>
            <Stepper
              value={draft.target_rate_kg_per_week ?? bounds.default}
              min={bounds.min}
              max={bounds.max}
              step={0.1}
              onChange={(v) => update({ target_rate_kg_per_week: v })}
              format={formatRate}
            />
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Finish" onPress={onFinish} disabled={!canFinish} loading={submitting} style={styles.button} />
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
  container: { flexGrow: 1, padding: t.spacing.xxl, paddingTop: t.spacing.xxxl + t.spacing.md },
  title: { ...t.typography.h1, color: t.colors.textPrimary, marginBottom: t.spacing.xl },
  label: {
    ...t.typography.label,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.md,
    marginTop: t.spacing.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  button: { marginTop: t.spacing.xl },
  error: { color: t.colors.danger, marginTop: t.spacing.md, textAlign: 'center', ...t.typography.caption },
});
}
