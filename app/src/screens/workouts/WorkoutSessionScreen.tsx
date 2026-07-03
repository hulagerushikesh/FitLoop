import React, { useEffect, useMemo, useState } from 'react';
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
  fetchRoutine,
  fetchRoutineExercises,
  fetchLastSessionSets,
  fetchActiveSession,
  fetchSessionLogs,
  startSession,
  logSet,
  finishSession,
  type RoutineExerciseRow,
} from '../../services/workouts';
import { fetchLatestWeight } from '../../services/profile';
import { estimateSessionCalories } from '../../engine/calorieBurn';
import { suggestNextSet, bestSet } from '../../engine/progressiveOverload';
import RestTimer from '../../components/RestTimer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import ScreenContainer from '../../components/ScreenContainer';
import { DEFAULT_REST_SECONDS } from '../../constants/workoutTemplates';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme/theme';
import type { WorkoutLog, WorkoutSession } from '../../types/database';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutSession'>;

interface LoggedSet {
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
}

function ExerciseLogCard({
  routineExercise,
  lastSets,
  loggedSets,
  onLogSet,
}: {
  routineExercise: RoutineExerciseRow;
  lastSets: WorkoutLog[];
  loggedSets: LoggedSet[];
  onLogSet: (input: LoggedSet) => void;
}) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');

  const lastBest = bestSet(
    lastSets
      .filter((s) => s.weight_kg != null && s.reps != null)
      .map((s) => ({ weightKg: s.weight_kg!, reps: s.reps! }))
  );
  const suggestions = lastBest ? suggestNextSet(lastBest) : [];

  const onSubmit = () => {
    onLogSet({
      weight_kg: weight ? Number(weight) : null,
      reps: reps ? Number(reps) : null,
      rpe: rpe ? Number(rpe) : null,
    });
    setWeight('');
    setReps('');
    setRpe('');
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.exerciseName}>{routineExercise.exercise.name}</Text>
      <Text style={styles.target}>
        Target: {routineExercise.target_sets} sets
        {routineExercise.target_reps ? ` x ${routineExercise.target_reps} reps` : ''}
      </Text>

      {lastSets.length > 0 ? (
        <Text style={styles.lastTime}>
          Last time: {lastSets.map((s) => `${s.weight_kg ?? '-'}kg x ${s.reps ?? '-'}`).join(', ')}
        </Text>
      ) : null}

      {suggestions.length > 0 ? (
        <View style={styles.suggestionRow}>
          <Ionicons name="trending-up" size={14} color={COLORS.accent} />
          <Text style={styles.suggestion}>{suggestions.map((s) => s.label).join(' or ')}</Text>
        </View>
      ) : null}

      {loggedSets.map((s, i) => (
        <Text key={i} style={styles.loggedSet}>
          Set {i + 1}: {s.weight_kg ?? '-'}kg x {s.reps ?? '-'} {s.rpe ? `@ RPE ${s.rpe}` : ''}
        </Text>
      ))}

      <View style={styles.inputRow}>
        <View style={styles.setField}>
          <Text style={styles.setFieldLabel}>Kg</Text>
          <TextInput
            style={styles.setInput}
            placeholder="0"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
        </View>
        <View style={styles.setField}>
          <Text style={styles.setFieldLabel}>Reps</Text>
          <TextInput
            style={styles.setInput}
            placeholder="0"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="number-pad"
            value={reps}
            onChangeText={setReps}
          />
        </View>
        <View style={styles.setField}>
          <Text style={styles.setFieldLabel}>RPE</Text>
          <TextInput
            style={styles.setInput}
            placeholder="0"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
            value={rpe}
            onChangeText={setRpe}
          />
        </View>
        <Pressable
          style={[styles.logButton, (!weight || !reps) && styles.logButtonDisabled]}
          disabled={!weight || !reps}
          onPress={onSubmit}
        >
          <Text style={styles.logButtonText}>Log</Text>
        </Pressable>
      </View>
    </Card>
  );
}

export default function WorkoutSessionScreen({ route, navigation }: Props) {
  const { workoutId } = route.params;
  const { user } = useAuth();

  const [routineName, setRoutineName] = useState('');
  const [routineExercises, setRoutineExercises] = useState<RoutineExerciseRow[]>([]);
  const [lastSetsByExercise, setLastSetsByExercise] = useState<Record<string, WorkoutLog[]>>({});
  const [loggedSets, setLoggedSets] = useState<Record<string, LoggedSet[]>>({});
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [bodyWeightKg, setBodyWeightKg] = useState<number | null>(null);
  const [restTimerKey, setRestTimerKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      const [routine, exercises, weight] = await Promise.all([
        fetchRoutine(workoutId),
        fetchRoutineExercises(workoutId),
        fetchLatestWeight(user.id),
      ]);
      setRoutineName(routine.name);
      setRoutineExercises(exercises);
      setBodyWeightKg(weight);

      const activeSession = await fetchActiveSession(user.id, workoutId);
      const currentSession = activeSession ?? (await startSession(user.id, workoutId, routine.name));
      setSession(currentSession);

      const [lastSetsEntries, resumedLogs] = await Promise.all([
        Promise.all(
          exercises.map(async (re) => [
            re.exercise.id,
            await fetchLastSessionSets(user.id, re.exercise.id, currentSession.id),
          ] as const)
        ),
        activeSession ? fetchSessionLogs(activeSession.id) : Promise.resolve([]),
      ]);
      setLastSetsByExercise(Object.fromEntries(lastSetsEntries));

      if (resumedLogs.length > 0) {
        const grouped: Record<string, LoggedSet[]> = {};
        for (const log of resumedLogs) {
          (grouped[log.exercise_id] ??= []).push({ weight_kg: log.weight_kg, reps: log.reps, rpe: log.rpe });
        }
        setLoggedSets(grouped);
      }
    })()
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to start session'))
      .finally(() => setLoading(false));
  }, [user, workoutId]);

  const onLogSet = async (exerciseId: string, input: LoggedSet) => {
    if (!user || !session) return;
    const setNumber = (loggedSets[exerciseId]?.length ?? 0) + 1;
    try {
      await logSet(user.id, session.id, workoutId, exerciseId, setNumber, input);
      setLoggedSets((prev) => ({
        ...prev,
        [exerciseId]: [...(prev[exerciseId] ?? []), input],
      }));
      setRestTimerKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log set');
    }
  };

  const totalSetsLogged = useMemo(
    () => Object.values(loggedSets).reduce((sum, sets) => sum + sets.length, 0),
    [loggedSets]
  );

  const onFinish = async () => {
    if (!session) return;
    setFinishing(true);
    setError(null);
    try {
      const durationMinutes = Math.max(1, (Date.now() - new Date(session.started_at).getTime()) / 60000);
      const exercisesWithSets = routineExercises
        .map((re) => ({
          metValue: re.exercise.met_value ?? 5,
          setCount: loggedSets[re.exercise.id]?.length ?? 0,
        }))
        .filter((e) => e.setCount > 0);

      const caloriesBurned = estimateSessionCalories(exercisesWithSets, bodyWeightKg ?? 70, durationMinutes);
      await finishSession(session.id, caloriesBurned);

      // Alert.alert doesn't block and isn't implemented on react-native-web, so
      // navigation can't be gated on its callback — fire it and navigate together.
      Alert.alert('Workout complete', `Estimated ${caloriesBurned} kcal burned across ${totalSetsLogged} sets.`);
      navigation.navigate('WorkoutsHome');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to finish workout');
    } finally {
      setFinishing(false);
    }
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
          <Text style={styles.title}>{routineName}</Text>

          <RestTimer startKey={restTimerKey} defaultSeconds={DEFAULT_REST_SECONDS} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {routineExercises.map((re) => (
            <ExerciseLogCard
              key={re.id}
              routineExercise={re}
              lastSets={lastSetsByExercise[re.exercise.id] ?? []}
              loggedSets={loggedSets[re.exercise.id] ?? []}
              onLogSet={(input) => onLogSet(re.exercise.id, input)}
            />
          ))}

          <Button
            label="Finish workout"
            onPress={onFinish}
            disabled={totalSetsLogged === 0}
            loading={finishing}
            style={styles.finishButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  container: { padding: SPACING.xxl, paddingBottom: 60 },
  title: { ...TYPOGRAPHY.h1, color: COLORS.textPrimary },
  card: { marginTop: SPACING.md },
  exerciseName: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary },
  target: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
  lastTime: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: SPACING.sm },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.xs },
  suggestion: { ...TYPOGRAPHY.caption, color: COLORS.accent, fontWeight: '700' },
  loggedSet: { ...TYPOGRAPHY.body, color: COLORS.textPrimary, marginTop: SPACING.xs },
  inputRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, alignItems: 'flex-end' },
  setField: { flex: 1, minWidth: 0 },
  setFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  setInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  logButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  logButtonDisabled: { opacity: 0.4 },
  logButtonText: { color: COLORS.accentText, fontWeight: '700' },
  finishButton: { marginTop: SPACING.xl },
  error: { color: COLORS.danger, marginTop: SPACING.md, textAlign: 'center', ...TYPOGRAPHY.caption },
});
