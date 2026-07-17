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
import { Disc3, Mic, Plus, Repeat2, TrendingUp } from 'lucide-react-native';
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
  fetchExerciseLibrary,
  startSession,
  logSet,
  finishSession,
  updateMuscleFatigueAfterSession,
  type RoutineExerciseRow,
} from '../../services/workouts';
import { enqueueSetLog } from '../../services/offlineQueue';
import { appendSet, nextSetNumber, totalSets } from '../../engine/sessionSets';
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
import VoiceLogButton from '../../components/voice/VoiceLogButton';
import VoiceConfirmModal, { type CommitItem } from '../../components/voice/VoiceConfirmModal';
import type { VoiceBatch } from '../../engine/voiceLogParsing';
import { Badge, Button, Card, Chip, NumberInput, useToast } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { DEFAULT_REST_SECONDS } from '../../constants/workoutTemplates';
import { FONTS, Theme, useTheme, useThemedStyles } from '../../theme';
import type { Exercise, SetType, WorkoutLog, WorkoutSession } from '../../types/database';

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
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [voiceResult, setVoiceResult] = useState<VoiceBatch | null>(null);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      const [routine, exercises, weight, allExercises] = await Promise.all([
        fetchRoutine(workoutId),
        fetchRoutineExercises(workoutId),
        fetchLatestWeight(user.id),
        fetchExerciseLibrary(user.id).catch(() => []),
      ]);
      setRoutineName(routine.name);
      setRoutineExercises(exercises);
      setBodyWeightKg(weight);
      setLibrary(allExercises);

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

  // Add an exercise picked from the library mid-session — it becomes a normal
  // log card (not saved to the routine), so the user isn't boxed into the plan.
  useEffect(() => {
    const addedId = route.params?.addedExerciseId;
    if (!addedId || !user || !session) return;
    navigation.setParams({ addedExerciseId: undefined });
    if (routineExercises.some((re) => re.exercise.id === addedId)) {
      showToast('That exercise is already in this workout', 'info');
      return;
    }
    const exercise = library.find((e) => e.id === addedId);
    if (!exercise) return;

    const syntheticRow: RoutineExerciseRow = {
      id: `adhoc:${exercise.id}`,
      workout_id: workoutId,
      exercise_id: exercise.id,
      order_index: routineExercises.length,
      target_sets: 3,
      target_reps: 10,
      superset_group: null,
      created_at: new Date().toISOString(),
      exercise,
    };
    setRoutineExercises((prev) => [...prev, syntheticRow]);

    // Pull in last-time + PR context so the added card behaves like the rest.
    Promise.all([
      fetchLastSessionSets(user.id, exercise.id, session.id),
      fetchHistoricalSets(user.id, exercise.id, session.id).then(bestEstimatedOneRepMax),
    ])
      .then(([last, best]) => {
        setLastSetsByExercise((prev) => ({ ...prev, [exercise.id]: last }));
        setBest1RmByExercise((prev) => ({ ...prev, [exercise.id]: best }));
      })
      .catch(() => {});
  }, [route.params?.addedExerciseId, user, session, library, routineExercises, workoutId]);

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
    const setNumber = nextSetNumber(loggedSets, exerciseId);

    // Optimistically record the set locally first so a network drop never loses
    // it — the UI shows it immediately whether or not the write reaches Supabase.
    setLoggedSets((prev) => appendSet(prev, exerciseId, input));
    setRestTimerKey((k) => k + 1);

    try {
      await logSet(user.id, session.id, workoutId, exerciseId, setNumber, input);
    } catch {
      // Likely offline mid-workout: queue the write to sync on reconnect rather
      // than dropping the set the user just did.
      await enqueueSetLog({
        userId: user.id,
        sessionId: session.id,
        workoutId,
        exerciseId,
        setNumber,
        input,
      }).catch(() => {});
      showToast('Saved offline — will sync when you reconnect', 'info');
    }

    const best = best1RmByExercise[exerciseId] ?? 0;
    if (isNewPr(input.weight_kg, input.reps, best)) {
      const newBest = estimateOneRepMax(input.weight_kg!, input.reps!);
      setBest1RmByExercise((prev) => ({ ...prev, [exerciseId]: newBest }));
      successHaptic();
      showToast(`🎉 New PR — est. 1RM ${units.formatWeight(newBest)}!`);
    }
  };

  const onVoiceResult = (batch: VoiceBatch) => {
    const hasWorkout = batch.items.some((i) => i.kind === 'workout');
    if (hasWorkout) {
      setVoiceResult(batch);
      setVoiceModalVisible(true);
    } else {
      showToast(batch.message ?? "Didn't catch a workout — try naming the exercise, sets and weight.", 'info');
    }
  };

  const onVoiceCommit = async (items: CommitItem[]) => {
    let sets = 0;
    for (const item of items) {
      if (item.kind !== 'workout') continue;
      for (const set of item.sets) {
        await onLogSet(item.exerciseId, { weight_kg: set.weightKg, reps: set.reps, rpe: null, set_type: 'normal' });
        sets += 1;
      }
    }
    setVoiceModalVisible(false);
    setVoiceResult(null);
    showToast(`Logged ${sets} set${sets === 1 ? '' : 's'} across ${items.length} exercise${items.length === 1 ? '' : 's'}`);
  };

  const totalSetsLogged = useMemo(
    () => totalSets(loggedSets),
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

          <View style={styles.voiceRow}>
            <View style={styles.voiceText}>
              <Text style={styles.voiceTitle}>Log a set by voice</Text>
              <Text style={styles.voiceSubtitle}>e.g. “bench press, 3 sets of 8 at 60 kilos”</Text>
            </View>
            <VoiceLogButton scope="workout" exerciseLibrary={library} onResult={onVoiceResult} onError={(m) => showToast(m, 'error')} />
          </View>

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

          <Pressable
            style={styles.addExerciseButton}
            onPress={() =>
              navigation.navigate('ExerciseLibrary', { selectMode: true, returnScreen: 'WorkoutSession', workoutId })
            }
          >
            <Plus size={18} color={t.colors.accentEmphasis} />
            <Text style={styles.addExerciseText}>Add an exercise</Text>
          </Pressable>

          <Button
            label="Finish workout"
            onPress={onFinish}
            disabled={totalSetsLogged === 0}
            loading={finishing}
            style={styles.finishButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <VoiceConfirmModal
        visible={voiceModalVisible}
        batch={voiceResult}
        exercises={library}
        supportedKinds={['workout']}
        onCommit={onVoiceCommit}
        onClose={() => {
          setVoiceModalVisible(false);
          setVoiceResult(null);
        }}
      />
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
    addExerciseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing.xs,
      marginTop: t.spacing.lg,
      paddingVertical: t.spacing.md,
      borderRadius: t.radii.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.border,
      backgroundColor: t.colors.surface,
    },
    addExerciseText: { ...t.typography.bodyBold, color: t.colors.accentEmphasis },
    finishButton: { marginTop: t.spacing.xl },
    voiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.spacing.md,
      marginTop: t.spacing.md,
      padding: t.spacing.md,
      borderRadius: t.radii.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surface,
    },
    voiceText: { flex: 1, minWidth: 0 },
    voiceTitle: { ...t.typography.bodyBold, color: t.colors.textPrimary },
    voiceSubtitle: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: 2 },
    error: { color: t.colors.danger, marginTop: t.spacing.md, textAlign: 'center', ...t.typography.caption },
  });
}
