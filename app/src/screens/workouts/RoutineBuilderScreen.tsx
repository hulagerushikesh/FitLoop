import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react-native";
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WorkoutsStackParamList } from '../../navigation/types';
import { confirm } from '../../utils/confirm';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchExerciseLibrary,
  fetchRoutine,
  fetchRoutineExercises,
  createRoutine,
  updateRoutineDetails,
  updateRoutineExercises,
  deleteRoutine,
  type RoutineExerciseInput,
} from '../../services/workouts';
import OptionPicker from '../../components/OptionPicker';
import TextField from '../../components/TextField';
import { Button } from '../../components/ui';
import { Card } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { SPLIT_TYPE_OPTIONS, SPLIT_TEMPLATE_EXERCISE_NAMES, DAY_LABELS_SHORT } from '../../constants/workoutTemplates';
import { FONTS, Theme, useTheme, useThemedStyles } from '../../theme';
import type { Exercise, SplitType } from '../../types/database';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'RoutineBuilder'>;

interface DraftExercise {
  exercise: Exercise;
  target_sets: number;
  target_reps: number | null;
}

export default function RoutineBuilderScreen({ navigation, route }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const workoutId = route.params?.workoutId;
  const isEditing = !!workoutId;

  const [name, setName] = useState('');
  const [splitType, setSplitType] = useState<SplitType | undefined>();
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(route.params?.initialDayOfWeek ?? null);
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([]);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchExerciseLibrary(user.id),
      isEditing ? fetchRoutineExercises(workoutId!) : Promise.resolve([]),
      isEditing ? fetchRoutine(workoutId!) : Promise.resolve(null),
    ])
      .then(([lib, routineExercises, routine]) => {
        setLibrary(lib);
        if (routine) {
          setName(routine.name);
          setSplitType(routine.split_type ?? undefined);
          setDayOfWeek(routine.day_of_week);
        }
        if (routineExercises.length > 0) {
          setDraftExercises(
            routineExercises.map((re) => ({
              exercise: re.exercise,
              target_sets: re.target_sets,
              target_reps: re.target_reps,
            }))
          );
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user, workoutId]);

  // Consume the exercise picked in ExerciseLibraryScreen (selectMode navigation).
  useEffect(() => {
    const selectedId = route.params?.selectedExerciseId;
    if (!selectedId) return;
    const exercise = library.find((e) => e.id === selectedId);
    if (exercise && !draftExercises.some((d) => d.exercise.id === selectedId)) {
      setDraftExercises((prev) => [...prev, { exercise, target_sets: 3, target_reps: 10 }]);
    }
    navigation.setParams({ selectedExerciseId: undefined });
  }, [route.params?.selectedExerciseId, library]);

  const onSelectSplit = (value: SplitType) => {
    setSplitType(value);
    if (!isEditing && draftExercises.length === 0 && library.length > 0) {
      const names = SPLIT_TEMPLATE_EXERCISE_NAMES[value];
      const templateExercises = names
        .map((n) => library.find((e) => e.name === n))
        .filter((e): e is Exercise => !!e)
        .map((exercise) => ({ exercise, target_sets: 3, target_reps: 10 }));
      setDraftExercises(templateExercises);
    }
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    setDraftExercises((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeExercise = (index: number) => {
    setDraftExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSets = (index: number, delta: number) => {
    setDraftExercises((prev) =>
      prev.map((d, i) => (i === index ? { ...d, target_sets: Math.max(1, d.target_sets + delta) } : d))
    );
  };

  const updateReps = (index: number, text: string) => {
    const reps = text ? Number(text) : null;
    setDraftExercises((prev) => prev.map((d, i) => (i === index ? { ...d, target_reps: reps } : d)));
  };

  const canSave = !!user && name.trim().length > 0 && draftExercises.length > 0;

  const onSave = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      const exercisePayload: RoutineExerciseInput[] = draftExercises.map((d, i) => ({
        exercise_id: d.exercise.id,
        order_index: i,
        target_sets: d.target_sets,
        target_reps: d.target_reps,
      }));

      if (isEditing) {
        await updateRoutineDetails(workoutId!, { name: name.trim(), split_type: splitType ?? null, day_of_week: dayOfWeek });
        await updateRoutineExercises(workoutId!, exercisePayload);
      } else {
        await createRoutine(user.id, {
          name: name.trim(),
          split_type: splitType ?? null,
          day_of_week: dayOfWeek,
          exercises: exercisePayload,
        });
      }
      navigation.navigate('WorkoutsHome');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save routine');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!workoutId) return;
    const ok = await confirm({
      title: 'Delete routine?',
      message: name,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteRoutine(workoutId);
      navigation.navigate('WorkoutsHome');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete routine');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={t.colors.accentEmphasis} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TextField label="Routine name" placeholder="e.g. Push Day" value={name} onChangeText={setName} />

          <Text style={styles.label}>Day of week</Text>
          <View style={styles.dayRow}>
            {DAY_LABELS_SHORT.map((label, i) => {
              const active = dayOfWeek === i;
              return (
                <Pressable
                  key={label}
                  style={[styles.dayPill, active && styles.dayPillActive]}
                  onPress={() => setDayOfWeek(active ? null : i)}
                >
                  <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Split type</Text>
          <OptionPicker options={SPLIT_TYPE_OPTIONS} selected={splitType} onSelect={onSelectSplit} />

          <View style={styles.exercisesHeader}>
            <Text style={styles.label}>Exercises</Text>
            <Pressable style={styles.addLinkRow} onPress={() => navigation.navigate('ExerciseLibrary', { selectMode: true })}>
              <Plus size={16} color={t.colors.accentEmphasis} />
              <Text style={styles.addLink}>Add exercise</Text>
            </Pressable>
          </View>

          {draftExercises.length === 0 ? (
            <Text style={styles.empty}>No exercises yet — pick a split type for a starting point, or add exercises manually.</Text>
          ) : (
            draftExercises.map((d, i) => (
              <Card key={d.exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseRow}>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{d.exercise.name}</Text>
                    <View style={styles.exerciseControls}>
                      <Pressable onPress={() => updateSets(i, -1)} style={styles.smallButton}>
                        <Text style={styles.smallButtonText}>-</Text>
                      </Pressable>
                      <Text style={styles.setsText}>{d.target_sets} sets</Text>
                      <Pressable onPress={() => updateSets(i, 1)} style={styles.smallButton}>
                        <Text style={styles.smallButtonText}>+</Text>
                      </Pressable>
                      <TextInput
                        style={styles.repsInput}
                        placeholderTextColor={t.colors.textTertiary}
                        keyboardType="number-pad"
                        value={d.target_reps?.toString() ?? ''}
                        onChangeText={(t) => updateReps(i, t)}
                        placeholder="reps"
                      />
                    </View>
                  </View>
                  <View style={styles.reorderControls}>
                    <Pressable onPress={() => moveExercise(i, -1)} style={styles.iconButton}>
                      <ChevronUp size={16} color={t.colors.textPrimary} />
                    </Pressable>
                    <Pressable onPress={() => moveExercise(i, 1)} style={styles.iconButton}>
                      <ChevronDown size={16} color={t.colors.textPrimary} />
                    </Pressable>
                    <Pressable onPress={() => removeExercise(i)} style={styles.removeButton}>
                      <X size={16} color={t.colors.danger} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Save routine" onPress={onSave} disabled={!canSave} loading={saving} style={styles.saveButton} />
          {isEditing ? (
            <Button label="Delete routine" onPress={onDelete} variant="destructive" loading={deleting} style={styles.deleteRoutineButton} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  container: { padding: t.spacing.xxl, paddingBottom: 60 },
  label: { ...t.typography.label, color: t.colors.textSecondary, marginBottom: t.spacing.sm, marginTop: t.spacing.md, textTransform: 'uppercase' },
  dayRow: { flexDirection: 'row', gap: t.spacing.xs, marginBottom: t.spacing.sm },
  dayPill: {
    flex: 1,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
  },
  dayPillActive: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
  dayPillText: { fontSize: 12, fontFamily: FONTS.bold, color: t.colors.textSecondary },
  dayPillTextActive: { color: t.colors.onAccent },
  exercisesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: t.spacing.xl },
  addLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  addLink: { color: t.colors.accentEmphasis, fontFamily: FONTS.bold },
  empty: { color: t.colors.textSecondary, ...t.typography.caption, marginTop: t.spacing.md },
  exerciseCard: { marginTop: t.spacing.sm, padding: t.spacing.md },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseInfo: { flex: 1 },
  exerciseName: { ...t.typography.bodyBold, color: t.colors.textPrimary, marginBottom: t.spacing.sm },
  exerciseControls: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  setsText: { ...t.typography.caption, color: t.colors.textSecondary, minWidth: 50 },
  repsInput: {
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.radii.sm,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 4,
    width: 60,
    fontSize: 13,
    color: t.colors.textPrimary,
  },
  reorderControls: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, marginLeft: t.spacing.sm },
  smallButton: {
    width: 28,
    height: 28,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: { fontSize: 14, fontFamily: FONTS.bold, color: t.colors.onAccent },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.dangerMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: { marginTop: t.spacing.xl },
  deleteRoutineButton: { marginTop: t.spacing.md, marginBottom: t.spacing.xl },
  error: { color: t.colors.danger, marginTop: t.spacing.lg, textAlign: 'center', ...t.typography.caption },
});
}
