import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Disc3, Mic, Repeat2, TrendingUp } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WorkoutsStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchRoutine,
  fetchRoutineExercises,
  fetchLastSessionSets,
  fetchActiveSession,
  fetchSessionLogs,
  fetchHistoricalSets,
  startSession,
  logSet,
  finishSession,
  updateMuscleFatigueAfterSession,
  type RoutineExerciseRow,
} from '../../services/workouts';
import { fetchLatestWeight } from '../../services/profile';
import { useUnits } from '../../hooks/useUnits';
import { estimateSessionCalories } from '../../engine/calorieBurn';
import { suggestNextSet, bestSet } from '../../engine/progressiveOverload';
import { bestEstimatedOneRepMax, estimateOneRepMax, isNewPr } from '../../engine/oneRepMax';
import { RECOVERY_HOURS } from '../../engine/muscleRecovery';
import { parseSpokenSet } from '../../utils/voiceSetParser';
import { lbToKg } from '../../utils/units';
import { successHaptic } from '../../utils/haptics';
import RestTimer from '../../components/RestTimer';
import PlateCalculatorSheet from '../../components/PlateCalculatorSheet';
import { Badge, Button, Card, Chip, NumberInput, useToast } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { DEFAULT_REST_SECONDS } from '../../constants/workoutTemplates';
import { FONTS, Theme, useTheme, useThemedStyles } from '../../theme';
import type { SetType, WorkoutLog, WorkoutSession } from '../../types/database';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutSession'>;

interface LoggedSet {
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  set_type: SetType;
}

const SET_TYPE_LABELS: { value: SetType; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'drop', label: 'Drop' },
  { value: 'failure', label: 'AMRAP' },
];

// Web-only speech recognition (Web Speech API). Native needs a dev-client
// STT module, so the mic button simply doesn't render there.
function getSpeechRecognition(): (new () => any) | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function ExerciseLogCard({
  routineExercise,
  supersetLabel,
  lastSets,
  loggedSets,
  historicalBest1Rm,
  onLogSet,
}: {
  routineExercise: RoutineExerciseRow;
  supersetLabel: string | null;
  lastSets: WorkoutLog[];
  loggedSets: LoggedSet[];
  historicalBest1Rm: number;
  onLogSet: (input: LoggedSet) => void;
}) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const units = useUnits();
  const { showToast } = useToast();

  const lastBest = bestSet(
    lastSets
      .filter((s) => s.weight_kg != null && s.reps != null)
      .map((s) => ({ weightKg: s.weight_kg!, reps: s.reps! }))
  );
  const suggestions = lastBest ? suggestNextSet(lastBest) : [];

  // Strong-style pre-fill: start from last session's best set so an
  // identical set is one tap on Log.
  const [weight, setWeight] = useState(
    lastBest ? String(units.displayWeight(lastBest.weightKg)) : ''
  );
  const [reps, setReps] = useState(lastBest ? String(lastBest.reps) : '');
  const [rpe, setRpe] = useState('');
  const [setType, setSetType] = useState<SetType>('normal');
  const [showPlates, setShowPlates] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const SpeechRecognition = getSpeechRecognition();

  const weightNum = Number(weight);
  const repsNum = Number(reps);
  const liveOneRm =
    weight && reps && weightNum > 0 && repsNum > 0
      ? estimateOneRepMax(units.parseWeight(weightNum), repsNum)
      : null;

  const submit = (input: LoggedSet) => {
    onLogSet(input);
    setSetType('normal');
    setRpe('');
  };

  const onSubmit = () => {
    submit({
      weight_kg: weight ? units.parseWeight(weightNum) : null,
      reps: reps ? repsNum : null,
      rpe: rpe ? Number(rpe) : null,
      set_type: setType,
    });
  };

  const onRepeatLast = () => {
    const last = loggedSets[loggedSets.length - 1];
    if (!last) return;
    submit({ ...last });
  };

  const onMicPress = () => {
    if (!SpeechRecognition) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      const parsed = parseSpokenSet(transcript);
      if (!parsed) {
        showToast(`Couldn't parse "${transcript}" — try "135 for 8"`, 'error');
        return;
      }
      // Spoken unit wins; otherwise assume the user's display unit.
      const weightKg =
        parsed.unit === 'kg'
          ? parsed.weight
          : parsed.unit === 'lb'
            ? lbToKg(parsed.weight)
            : units.parseWeight(parsed.weight);
      setWeight(String(units.displayWeight(weightKg)));
      setReps(String(parsed.reps));
      showToast('Heard it — tap Log to confirm', 'info');
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  return (
    <Card style={{ ...styles.card, ...(supersetLabel ? styles.supersetCard : null) }}>
      <View style={styles.cardHeader}>
        <Text style={styles.exerciseName}>{routineExercise.exercise.name}</Text>
        {supersetLabel ? <Badge label={supersetLabel} tone="accent" /> : null}
      </View>
      <Text style={styles.target}>
        Target: {routineExercise.target_sets} sets
        {routineExercise.target_reps ? ` x ${routineExercise.target_reps} reps` : ''}
      </Text>

      {lastSets.length > 0 ? (
        <Text style={styles.lastTime}>
          Last time:{' '}
          {lastSets
            .map((s) => `${s.weight_kg != null ? units.formatWeight(s.weight_kg) : '-'} x ${s.reps ?? '-'}`)
            .join(', ')}
        </Text>
      ) : null}

      {suggestions.length > 0 ? (
        <View style={styles.suggestionRow}>
          <TrendingUp size={14} color={t.colors.accentEmphasis} />
          <Text style={styles.suggestion}>
            {suggestions.map((s) => `${units.formatWeight(s.weightKg)} x ${s.reps}`).join(' or ')}
          </Text>
        </View>
      ) : null}

      {loggedSets.map((s, i) => (
        <Text key={i} style={styles.loggedSet}>
          Set {i + 1}: {s.weight_kg != null ? units.formatWeight(s.weight_kg) : '-'} x {s.reps ?? '-'}
          {s.set_type === 'drop' ? '  ↘ drop' : s.set_type === 'failure' ? '  ⚡ AMRAP' : ''}
          {s.rpe ? `  @ RPE ${s.rpe}` : ''}
        </Text>
      ))}

      <View style={styles.inputRow}>
        <NumberInput
          label={units.weightUnit}
          value={weight}
          onChangeText={setWeight}
          step={units.unitSystem === 'imperial' ? 5 : 2.5}
          style={styles.weightInput}
        />
        <NumberInput label="Reps" value={reps} onChangeText={setReps} step={1} style={styles.repsInput} />
      </View>

      <View style={styles.setTypeRow}>
        {SET_TYPE_LABELS.map(({ value, label }) => (
          <Chip
            key={value}
            label={label}
            selected={setType === value}
            onPress={() => setSetType(value)}
            style={styles.setTypeChip}
          />
        ))}
      </View>

      <View style={styles.actionRow}>
        {liveOneRm ? (
          <Text style={styles.oneRm}>
            ≈ 1RM {units.formatWeight(liveOneRm)}
            {historicalBest1Rm > 0 && liveOneRm > historicalBest1Rm ? '  🔥 PR territory' : ''}
          </Text>
        ) : (
          <View />
        )}
        <View style={styles.actionButtons}>
          <Pressable
            style={styles.iconAction}
            onPress={() => setShowPlates(true)}
            accessibilityLabel="Plate calculator"
          >
            <Disc3 size={18} color={t.colors.textSecondary} />
          </Pressable>
          {SpeechRecognition ? (
            <Pressable
              style={[styles.iconAction, listening && styles.iconActionActive]}
              onPress={onMicPress}
              accessibilityLabel="Log set by voice"
            >
              <Mic size={18} color={listening ? t.colors.onAccent : t.colors.textSecondary} />
            </Pressable>
          ) : null}
          {loggedSets.length > 0 ? (
            <Pressable style={styles.iconAction} onPress={onRepeatLast} accessibilityLabel="Repeat last set">
              <Repeat2 size={18} color={t.colors.textSecondary} />
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.logButton, (!weight || !reps) && styles.logButtonDisabled]}
            disabled={!weight || !reps}
            onPress={onSubmit}
          >
            <Text style={styles.logButtonText}>Log set</Text>
          </Pressable>
        </View>
      </View>

      {showPlates ? (
        <PlateCalculatorSheet
          visible
          onClose={() => setShowPlates(false)}
          initialWeight={weightNum > 0 ? weightNum : undefined}
        />
      ) : null}
    </Card>
  );
}

export default function WorkoutSessionScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const units = useUnits();
  const { workoutId } = route.params;
  const { user } = useAuth();

  const [routineName, setRoutineName] = useState('');
  const [routineExercises, setRoutineExercises] = useState<RoutineExerciseRow[]>([]);
  const [lastSetsByExercise, setLastSetsByExercise] = useState<Record<string, WorkoutLog[]>>({});
  const [best1RmByExercise, setBest1RmByExercise] = useState<Record<string, number>>({});
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

      const [lastSetsEntries, historyEntries, resumedLogs] = await Promise.all([
        Promise.all(
          exercises.map(async (re) => [
            re.exercise.id,
            await fetchLastSessionSets(user.id, re.exercise.id, currentSession.id),
          ] as const)
        ),
        Promise.all(
          exercises.map(async (re) => [
            re.exercise.id,
            bestEstimatedOneRepMax(await fetchHistoricalSets(user.id, re.exercise.id, currentSession.id)),
          ] as const)
        ),
        activeSession ? fetchSessionLogs(activeSession.id) : Promise.resolve([]),
      ]);
      setLastSetsByExercise(Object.fromEntries(lastSetsEntries));
      setBest1RmByExercise(Object.fromEntries(historyEntries));

      if (resumedLogs.length > 0) {
        const grouped: Record<string, LoggedSet[]> = {};
        for (const log of resumedLogs) {
          (grouped[log.exercise_id] ??= []).push({
            weight_kg: log.weight_kg,
            reps: log.reps,
            rpe: log.rpe,
            set_type: log.set_type ?? 'normal',
          });
        }
        setLoggedSets(grouped);
      }
    })()
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to start session'))
      .finally(() => setLoading(false));
  }, [user, workoutId]);

  // Superset labels: exercises sharing a superset_group get "Superset A/B/…".
  const supersetLabels = useMemo(() => {
    const labels = new Map<string, string>();
    const groupLetters = new Map<number, string>();
    for (const re of routineExercises) {
      if (re.superset_group == null) continue;
      if (!groupLetters.has(re.superset_group)) {
        groupLetters.set(re.superset_group, String.fromCharCode(65 + groupLetters.size));
      }
      labels.set(re.id, `Superset ${groupLetters.get(re.superset_group)}`);
    }
    return labels;
  }, [routineExercises]);

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

      const best = best1RmByExercise[exerciseId] ?? 0;
      if (isNewPr(input.weight_kg, input.reps, best)) {
        const newBest = estimateOneRepMax(input.weight_kg!, input.reps!);
        setBest1RmByExercise((prev) => ({ ...prev, [exerciseId]: newBest }));
        successHaptic();
        showToast(`🎉 New PR — est. 1RM ${units.formatWeight(newBest)}!`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log set');
    }
  };

  const totalSetsLogged = useMemo(
    () => Object.values(loggedSets).reduce((sum, sets) => sum + sets.length, 0),
    [loggedSets]
  );

  const onFinish = async () => {
    if (!session || !user) return;
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

      // Recovery model refresh — never block finishing on it.
      const trained = routineExercises
        .filter((re) => (loggedSets[re.exercise.id]?.length ?? 0) > 0)
        .map((re) => ({
          muscleGroup: re.exercise.muscle_group,
          recoveryHours: RECOVERY_HOURS[re.exercise.muscle_group],
        }));
      updateMuscleFatigueAfterSession(user.id, trained).catch(() => {});

      showToast(`Workout complete — ~${caloriesBurned} kcal across ${totalSetsLogged} sets`);
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
        <ActivityIndicator size="large" color={t.colors.accentEmphasis} />
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
              supersetLabel={supersetLabels.get(re.id) ?? null}
              lastSets={lastSetsByExercise[re.exercise.id] ?? []}
              loggedSets={loggedSets[re.exercise.id] ?? []}
              historicalBest1Rm={best1RmByExercise[re.exercise.id] ?? 0}
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

function createStyles(t: Theme) {
  return StyleSheet.create({
    flex: { flex: 1 },
    center: { alignItems: 'center', justifyContent: 'center' },
    container: { padding: t.spacing.xl, paddingBottom: t.spacing.xxxl },
    title: { ...t.typography.h1, color: t.colors.textPrimary },
    card: { marginTop: t.spacing.md },
    supersetCard: { borderColor: t.colors.accentEmphasis, borderStyle: 'dashed' },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.spacing.sm,
    },
    exerciseName: { ...t.typography.h3, color: t.colors.textPrimary, flexShrink: 1 },
    target: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: 2 },
    lastTime: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: t.spacing.sm },
    suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: t.spacing.xs },
    suggestion: { ...t.typography.caption, color: t.colors.accentEmphasis, fontFamily: FONTS.bold },
    loggedSet: { ...t.typography.body, color: t.colors.textPrimary, marginTop: t.spacing.xs },
    inputRow: { flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.md },
    weightInput: { flex: 3, minWidth: 0 },
    repsInput: { flex: 2, minWidth: 0 },
    setTypeRow: { flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.sm },
    setTypeChip: { flex: 1, justifyContent: 'center', minHeight: 32, paddingVertical: 2 },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: t.spacing.md,
      gap: t.spacing.sm,
    },
    oneRm: {
      ...t.typography.caption,
      fontVariant: ['tabular-nums'],
      color: t.colors.textSecondary,
      flexShrink: 1,
    },
    actionButtons: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
    iconAction: {
      width: 40,
      height: 40,
      borderRadius: t.radii.md,
      backgroundColor: t.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconActionActive: { backgroundColor: t.colors.danger, borderColor: t.colors.danger },
    logButton: {
      backgroundColor: t.colors.accent,
      borderRadius: t.radii.md,
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: t.spacing.lg,
    },
    logButtonDisabled: { opacity: 0.4 },
    logButtonText: { color: t.colors.onAccent, fontFamily: FONTS.bold },
    finishButton: { marginTop: t.spacing.xl },
    error: { color: t.colors.danger, marginTop: t.spacing.md, textAlign: 'center', ...t.typography.caption },
  });
}
