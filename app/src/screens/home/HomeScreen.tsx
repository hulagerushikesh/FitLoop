import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Camera, Calendar, CheckCircle2, Circle, Dumbbell, Flame, UtensilsCrossed } from 'lucide-react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { HomeStackParamList, MainTabParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { addFoodLog, fetchDailyLogs, fetchRecentSummary } from '../../services/nutrition';
import { captureDailyProgressPhoto, fetchProgressPhotoMap } from '../../services/analytics';
import { fetchLatestGoal } from '../../services/goals';
import {
  fetchExerciseLibrary,
  fetchMuscleFatigue,
  fetchRoutineMuscleGroups,
  fetchRoutines,
  logActivitySession,
  logAdhocWorkout,
} from '../../services/workouts';
import ScreenContainer from '../../components/ScreenContainer';
import { Card, Chip, CountUp, ProgressRing, SkeletonCard, useToast } from '../../components/ui';
import VoiceLogButton from '../../components/voice/VoiceLogButton';
import VoiceConfirmModal, { type VoiceWorkoutSaveInput } from '../../components/voice/VoiceConfirmModal';
import type { VoiceLogResult } from '../../engine/voiceLogParsing';
import ProgressBar from '../../components/ProgressBar';
import { loggingStreak } from '../../engine/analytics';
import { Theme, useTheme, useThemedStyles } from '../../theme';
import type { FoodLog, Goal, Workout } from '../../types/database';
import {
  computeRecoveryStates,
  rankRoutinesByRecovery,
  type MuscleRecoveryState,
  type RankedRoutine,
} from '../../engine/muscleRecovery';

type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'HomeMain'>,
  BottomTabScreenProps<MainTabParamList>
>;

const TODAY_WEEKDAY = new Date().getDay();

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HomeScreen({ navigation }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [todayRoutine, setTodayRoutine] = useState<Workout | null>(null);
  const [recoveryStates, setRecoveryStates] = useState<MuscleRecoveryState[]>([]);
  const [suggested, setSuggested] = useState<RankedRoutine | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [library, setLibrary] = useState<{ id: string; name: string }[]>([]);
  const [voiceResult, setVoiceResult] = useState<VoiceLogResult | null>(null);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [photoDoneToday, setPhotoDoneToday] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchDailyLogs(user.id),
      fetchLatestGoal(user.id),
      fetchRoutines(user.id),
      fetchMuscleFatigue(user.id).catch(() => []),
      fetchRoutineMuscleGroups(user.id).catch(() => []),
      fetchRecentSummary(user.id, 40).catch(() => []),
      fetchExerciseLibrary(user.id).catch(() => []),
      fetchProgressPhotoMap(user.id, todayString(), todayString()).catch(() => ({})),
    ])
      .then(([l, g, routines, fatigue, routineGroups, recent, exercises, todayPhotos]) => {
        setLogs(l);
        setGoal(g);
        setLibrary(exercises.map((e) => ({ id: e.id, name: e.name })));
        setPhotoDoneToday(Object.keys(todayPhotos).length > 0);
        setTodayRoutine(routines.find((r) => r.day_of_week === TODAY_WEEKDAY) ?? null);
        const states = computeRecoveryStates(fatigue, new Date());
        setRecoveryStates(states);
        const trainedAnything = fatigue.length > 0;
        const ranked = rankRoutinesByRecovery(routineGroups, states);
        setSuggested(trainedAnything && ranked.length > 0 ? ranked[0] : null);
        const loggedDates = new Set(
          recent.filter((s) => s.calories_consumed > 0).map((s) => s.day)
        );
        setStreak(loggingStreak(loggedDates, todayString()));
      })
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totals = useMemo(
    () =>
      logs.reduce(
        (acc, l) => ({ calories: acc.calories + l.calories, protein_g: acc.protein_g + l.protein_g }),
        { calories: 0, protein_g: 0 }
      ),
    [logs]
  );

  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const remaining = goal ? Math.max(0, goal.calorie_target - totals.calories) : null;

  const closeVoice = () => {
    setVoiceModalVisible(false);
    setVoiceResult(null);
  };

  const onVoiceResult = (result: VoiceLogResult) => {
    setVoiceResult(result);
    setVoiceModalVisible(true);
  };

  const onSaveFood = async (food: { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }) => {
    if (!user) return;
    await addFoodLog(user.id, {
      name: food.name,
      servings: 1,
      calories: food.calories,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      meal_type: 'snack',
      source: 'ai_text',
      food_item_id: null,
      photo_path: null,
    });
    closeVoice();
    showToast('Food logged');
    load();
  };

  const onSaveWorkout = async (input: VoiceWorkoutSaveInput) => {
    if (!user) return;
    await logAdhocWorkout(user.id, input);
    closeVoice();
    showToast(`Logged ${input.exerciseName}`);
    load();
  };

  const onSaveActivity = async (activity: { activityName: string; durationMinutes: number | null; estimatedCalories: number | null }) => {
    if (!user) return;
    await logActivitySession(user.id, { ...activity, notes: null });
    closeVoice();
    showToast(`Logged ${activity.activityName}`);
    load();
  };

  const onTakeTodayPhoto = async () => {
    if (!user || capturingPhoto) return;
    setCapturingPhoto(true);
    try {
      const path = await captureDailyProgressPhoto(user.id);
      if (path) {
        setPhotoDoneToday(true);
        showToast(photoDoneToday ? 'Progress photo updated' : 'Progress photo saved 📸');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message;
      showToast(msg || 'Could not save photo', 'error');
    } finally {
      setCapturingPhoto(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingCol}>
            <Text style={styles.greeting}>Hey {firstName} 👋</Text>
            <Text style={styles.subGreeting}>Let's make today count.</Text>
          </View>
          {streak > 0 ? (
            <View style={styles.streakPill}>
              <Flame size={16} color={t.colors.energy} />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <SkeletonCard style={styles.card} />
        ) : goal ? (
          <Card style={styles.card} highlighted>
            <View style={styles.heroRow}>
              <ProgressRing
                progress={goal.calorie_target > 0 ? totals.calories / goal.calorie_target : 0}
                size={148}
                strokeWidth={13}
              >
                <CountUp value={remaining ?? 0} style={styles.remainingValue} />
                <Text style={styles.remainingLabel}>kcal left</Text>
              </ProgressRing>
              <View style={styles.heroSide}>
                <View style={styles.energyBadge}>
                  <Flame size={22} color={t.colors.energy} />
                </View>
                <Text style={styles.heroEaten}>
                  {Math.round(totals.calories)} <Text style={styles.heroEatenUnit}>eaten</Text>
                </Text>
                <Text style={styles.heroTarget}>of {goal.calorie_target} kcal</Text>
              </View>
            </View>
            <ProgressBar label="Protein" current={totals.protein_g} target={goal.protein_g} unit="g" color={t.colors.protein} />
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.emptyText}>Finish onboarding to see your daily targets here.</Text>
          </Card>
        )}

        {recoveryStates.some((s) => s.status !== 'fresh') ? (
          <>
            <Text style={styles.sectionTitle}>Muscle recovery</Text>
            <View style={styles.recoveryRow}>
              {recoveryStates
                .filter((s) => s.muscleGroup !== 'cardio' && s.muscleGroup !== 'full_body')
                .map((s) => (
                  <Chip
                    key={s.muscleGroup}
                    label={s.muscleGroup}
                    accentColor={
                      s.status === 'fresh'
                        ? t.colors.success
                        : s.status === 'recovering'
                          ? t.colors.warning
                          : t.colors.danger
                    }
                    icon={Circle}
                    style={styles.recoveryChip}
                  />
                ))}
            </View>
            {suggested && !todayRoutine ? (
              <Card
                style={styles.suggestionCard}
                onPress={() =>
                  navigation.navigate('Workouts', {
                    screen: 'WorkoutSession',
                    params: { workoutId: suggested.id },
                  })
                }
              >
                <Text style={styles.suggestionLabel}>Best fit for today</Text>
                <Text style={styles.suggestionName}>{suggested.name}</Text>
                <Text style={styles.suggestionWhy}>
                  {Math.round(suggested.score * 100)}% recovered muscle groups — tap to start
                </Text>
              </Card>
            ) : null}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.quickActions}>
          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate('Nutrition', { screen: 'LogMeal' })}
          >
            <UtensilsCrossed size={22} color={t.colors.accentEmphasis} />
            <Text style={styles.actionLabel}>Log food</Text>
          </Pressable>
          <Pressable
            style={styles.actionCard}
            onPress={() =>
              todayRoutine
                ? navigation.navigate('Workouts', {
                    screen: 'WorkoutSession',
                    params: { workoutId: todayRoutine.id },
                  })
                : navigation.navigate('Workouts', { screen: 'WorkoutsHome' })
            }
          >
            <Dumbbell size={22} color={t.colors.accentEmphasis} />
            <Text style={styles.actionLabel}>{todayRoutine ? `Start ${todayRoutine.name}` : 'Rest day'}</Text>
          </Pressable>
          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate('Profile', { screen: 'CalendarMain' })}
          >
            <Calendar size={22} color={t.colors.accentEmphasis} />
            <Text style={styles.actionLabel}>Calendar</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.photoAction, photoDoneToday && styles.photoActionDone]}
          onPress={onTakeTodayPhoto}
          disabled={capturingPhoto}
        >
          <View style={[styles.photoIcon, photoDoneToday && styles.photoIconDone]}>
            {photoDoneToday ? (
              <CheckCircle2 size={22} color={t.colors.success} />
            ) : (
              <Camera size={22} color={t.colors.accentEmphasis} />
            )}
          </View>
          <View style={styles.photoText}>
            <Text style={styles.photoTitle}>
              {photoDoneToday ? "Today's photo captured" : "Take today's progress photo"}
            </Text>
            <Text style={styles.photoSubtitle}>
              {photoDoneToday ? 'Tap to retake · view it in the Calendar' : 'Build the habit — one shot a day'}
            </Text>
          </View>
        </Pressable>
      </ScrollView>

      <View style={styles.fabContainer} pointerEvents="box-none">
        <VoiceLogButton scope="auto" exerciseLibrary={library} variant="fab" label="Speak a log" onResult={onVoiceResult} onError={(m) => showToast(m, 'error')} />
      </View>

      <VoiceConfirmModal
        visible={voiceModalVisible}
        result={voiceResult}
        exercises={library}
        onClose={closeVoice}
        onSaveFood={onSaveFood}
        onSaveWorkout={onSaveWorkout}
        onSaveActivity={onSaveActivity}
        onRouteFood={(transcript) => {
          closeVoice();
          navigation.navigate('Nutrition', { screen: 'LogMeal', params: { mode: 'text', describe: transcript } });
        }}
        onRouteWorkout={() => {
          closeVoice();
          navigation.navigate('Workouts', { screen: 'WorkoutsHome' });
        }}
      />
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
  container: { padding: t.spacing.xxl, paddingBottom: 60 },
  greetingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: t.spacing.xxl },
  greetingCol: { flex: 1 },
  greeting: { ...t.typography.h1, color: t.colors.textPrimary },
  subGreeting: { ...t.typography.body, color: t.colors.textSecondary, marginTop: t.spacing.xs },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: t.colors.energyMuted,
    borderRadius: t.radii.full,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 6,
    marginTop: t.spacing.xs,
  },
  streakText: { ...t.typography.statSmall, fontSize: 16, color: t.colors.energy },
  loader: { marginTop: t.spacing.xxl },
  card: { marginBottom: t.spacing.xl },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xl,
    marginBottom: t.spacing.lg,
  },
  heroSide: { flex: 1, gap: t.spacing.xs },
  remainingLabel: { ...t.typography.label, color: t.colors.textSecondary },
  remainingValue: { ...t.typography.stat, fontSize: 34, lineHeight: 38, color: t.colors.textPrimary },
  heroEaten: { ...t.typography.statSmall, color: t.colors.textPrimary },
  heroEatenUnit: { ...t.typography.caption, color: t.colors.textSecondary },
  heroTarget: { ...t.typography.caption, color: t.colors.textSecondary },
  energyBadge: {
    width: 44,
    height: 44,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.energyMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.xs,
  },
  emptyText: { ...t.typography.body, color: t.colors.textSecondary },
  recoveryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, marginBottom: t.spacing.lg },
  recoveryChip: { minHeight: 32, paddingVertical: 2 },
  suggestionCard: { marginBottom: t.spacing.xl, borderColor: t.colors.accentEmphasis },
  suggestionLabel: { ...t.typography.label, color: t.colors.textSecondary },
  suggestionName: { ...t.typography.h3, color: t.colors.textPrimary, marginTop: t.spacing.xs },
  suggestionWhy: { ...t.typography.caption, color: t.colors.accentEmphasis, marginTop: t.spacing.xs },
  sectionTitle: { ...t.typography.h3, color: t.colors.textPrimary, marginBottom: t.spacing.md },
  quickActions: { flexDirection: 'row', gap: t.spacing.md },
  actionCard: {
    flex: 1,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radii.lg,
    paddingVertical: t.spacing.lg,
    alignItems: 'center',
    gap: t.spacing.sm,
  },
  actionLabel: { ...t.typography.caption, color: t.colors.textPrimary, textAlign: 'center' },
  fabContainer: { position: 'absolute', right: t.spacing.xl, bottom: t.spacing.xl, alignItems: 'center' },
  photoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    marginTop: t.spacing.md,
    padding: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radii.lg,
  },
  photoActionDone: { borderColor: t.colors.success },
  photoIcon: {
    width: 44,
    height: 44,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIconDone: { backgroundColor: t.colors.surfaceElevated },
  photoText: { flex: 1, minWidth: 0 },
  photoTitle: { ...t.typography.bodyBold, color: t.colors.textPrimary },
  photoSubtitle: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: 2 },
});
}
