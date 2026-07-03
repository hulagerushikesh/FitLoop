import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WorkoutsStackParamList } from '../../navigation/types';
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
import Button from '../../components/Button';
import Card from '../../components/Card';
import ScreenContainer from '../../components/ScreenContainer';
import { SPLIT_TYPE_OPTIONS, SPLIT_TEMPLATE_EXERCISE_NAMES, DAY_LABELS_SHORT } from '../../constants/workoutTemplates';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme/theme';
import type { Exercise, SplitType } from '../../types/database';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'RoutineBuilder'>;

interface DraftExercise {
  exercise: Exercise;
  target_sets: number;
  target_reps: number | null;
}

export default function RoutineBuilderScreen({ navigation, route }: Props) {
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

  const onDelete = () => {
    if (!workoutId) return;
    Alert.alert('Delete routine?', name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteRoutine(workoutId);
            navigation.navigate('WorkoutsHome');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete routine');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
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
              <Ionicons name="add" size={16} color={COLORS.accent} />
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
                        placeholderTextColor={COLORS.textTertiary}
                        keyboardType="number-pad"
                        value={d.target_reps?.toString() ?? ''}
                        onChangeText={(t) => updateReps(i, t)}
                        placeholder="reps"
                      />
                    </View>
                  </View>
                  <View style={styles.reorderControls}>
                    <Pressable onPress={() => moveExercise(i, -1)} style={styles.iconButton}>
                      <Ionicons name="chevron-up" size={16} color={COLORS.textPrimary} />
                    </Pressable>
                    <Pressable onPress={() => moveExercise(i, 1)} style={styles.iconButton}>
                      <Ionicons name="chevron-down" size={16} color={COLORS.textPrimary} />
                    </Pressable>
                    <Pressable onPress={() => removeExercise(i)} style={styles.removeButton}>
                      <Ionicons name="close" size={16} color={COLORS.danger} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Save routine" onPress={onSave} disabled={!canSave} loading={saving} style={styles.saveButton} />
          {isEditing ? (
            <Button label="Delete routine" onPress={onDelete} variant="danger" loading={deleting} style={styles.deleteRoutineButton} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  container: { padding: SPACING.xxl, paddingBottom: 60 },
  label: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.md, textTransform: 'uppercase' },
  dayRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm },
  dayPill: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  dayPillActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dayPillText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  dayPillTextActive: { color: COLORS.accentText },
  exercisesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xl },
  addLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  addLink: { color: COLORS.accent, fontWeight: '700' },
  empty: { color: COLORS.textSecondary, ...TYPOGRAPHY.caption, marginTop: SPACING.md },
  exerciseCard: { marginTop: SPACING.sm, padding: SPACING.md },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseInfo: { flex: 1 },
  exerciseName: { ...TYPOGRAPHY.bodyBold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  exerciseControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  setsText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, minWidth: 50 },
  repsInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    width: 60,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  reorderControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginLeft: SPACING.sm },
  smallButton: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.accentText },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.dangerMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: { marginTop: SPACING.xl },
  deleteRoutineButton: { marginTop: SPACING.md, marginBottom: SPACING.xl },
  error: { color: COLORS.danger, marginTop: SPACING.lg, textAlign: 'center', ...TYPOGRAPHY.caption },
});
