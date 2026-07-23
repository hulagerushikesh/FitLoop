import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Activity,
  BarChart3,
  Droplet,
  Dumbbell,
  Flame,
  Ruler,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react-native';
import ScreenContainer from '../../components/ScreenContainer';
import Sparkline from '../../components/Sparkline';
import StackedBarChart, { StackedBar } from '../../components/StackedBarChart';
import { Badge, Button, Card, Chip, EmptyState, NumberInput, useToast } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import {
  loggingStreak,
  trendDirection,
  weekStartOf,
  weeklyVolume,
  type Trend,
} from '../../engine/analytics';
import { estimateOneRepMax } from '../../engine/oneRepMax';
import { ACHIEVEMENTS } from '../../engine/achievements';
import {
  addProgressPhoto,
  fetchMeasurements,
  fetchProgressPhotos,
  fetchTrainedExercises,
  fetchUnlockedAchievements,
  fetchVolumeEntries,
  fetchWeightHistory,
  logMeasurement,
  type BodyMeasurement,
  type ProgressPhoto,
} from '../../services/analytics';
import { fetchExerciseHistory, type ExerciseHistoryPoint } from '../../services/workouts';
import { fetchRecentSummary } from '../../services/nutrition';
import { fetchLatestGoal } from '../../services/goals';
import { pickAndUploadImage, publicImageUrl } from '../../services/images';
import { displayWeight, weightUnitLabel } from '../../utils/units';
import type { BodyMetric, DailySummary, Goal, MuscleGroup } from '../../types/database';
import { Theme, useTheme, useThemedStyles } from '../../theme';

const MEASUREMENT_TYPES = ['waist', 'chest', 'arms', 'hips', 'thighs'] as const;
type MeasurementType = (typeof MEASUREMENT_TYPES)[number];

const VOLUME_MUSCLE_ORDER: MuscleGroup[] = [
  'legs',
  'back',
  'chest',
  'shoulders',
  'arms',
  'forearms',
  'core',
  'full_body',
  'cardio',
];

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function TrendBadge({ trend }: { trend: Trend }) {
  if (trend === 'up') return <Badge label="Trending up" tone="success" />;
  if (trend === 'down') return <Badge label="Trending down" tone="danger" />;
  return <Badge label="Holding steady" tone="neutral" />;
}

export default function AnalyticsScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { showToast } = useToast();
  const unit = profile?.unit_system ?? 'metric';

  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [volumeWeeks, setVolumeWeeks] = useState<ReturnType<typeof weeklyVolume>>([]);
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistoryPoint[]>([]);
  const [weights, setWeights] = useState<BodyMetric[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [unlocked, setUnlocked] = useState<string[]>([]);

  const [measureType, setMeasureType] = useState<MeasurementType>('waist');
  const [measureValue, setMeasureValue] = useState('');
  const [savingMeasure, setSavingMeasure] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [sum, g, vol, ex, w, m, p, ach] = await Promise.all([
        fetchRecentSummary(user.id, 30),
        fetchLatestGoal(user.id),
        fetchVolumeEntries(user.id, 8),
        fetchTrainedExercises(user.id),
        fetchWeightHistory(user.id),
        fetchMeasurements(user.id),
        fetchProgressPhotos(user.id),
        fetchUnlockedAchievements(user.id),
      ]);
      setSummaries(sum);
      setGoal(g);
      setVolumeWeeks(weeklyVolume(vol));
      setExercises(ex);
      setWeights(w);
      setMeasurements(m);
      setPhotos(p);
      setUnlocked(ach);
      setSelectedExercise((prev) => prev ?? ex[0]?.id ?? null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Per-exercise history reloads when the picked exercise changes.
  const loadHistory = useCallback(async () => {
    if (!user || !selectedExercise) {
      setExerciseHistory([]);
      return;
    }
    try {
      setExerciseHistory(await fetchExerciseHistory(user.id, selectedExercise));
    } catch {
      setExerciseHistory([]);
    }
  }, [user, selectedExercise]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  // ---- Derived weekly recap ------------------------------------------------
  const recap = useMemo(() => {
    const thisWeek = weekStartOf(new Date());
    const byDay = new Map(summaries.map((s) => [s.day, s]));
    const loggedDates = new Set(
      summaries.filter((s) => s.calories_consumed > 0).map((s) => s.day)
    );
    const streak = loggingStreak(loggedDates, todayString());

    let workouts = 0;
    let burned = 0;
    for (const s of summaries) {
      if (s.day >= thisWeek) {
        workouts += s.workout_count;
        burned += s.calories_burned;
      }
    }

    const thisWeekVol = volumeWeeks.find((w) => w.weekStart === thisWeek)?.total ?? 0;

    // Adherence over the last 7 days for which a goal target exists.
    let hit = 0;
    let counted = 0;
    if (goal) {
      const cursor = new Date();
      for (let i = 0; i < 7; i++) {
        const key = cursor.toISOString().slice(0, 10);
        const day = byDay.get(key);
        if (day && day.calories_consumed > 0) {
          counted += 1;
          if (Math.abs(day.calories_consumed - goal.calorie_target) <= goal.calorie_target * 0.1)
            hit += 1;
        }
        cursor.setDate(cursor.getDate() - 1);
      }
    }
    const adherence = counted > 0 ? Math.round((hit / counted) * 100) : null;

    return { streak, workouts, burned, thisWeekVol, adherence };
  }, [summaries, volumeWeeks, goal]);

  // ---- Derived hydration (last 7 days, oldest→newest, UTC keys) ------------
  const hydration = useMemo(() => {
    const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const byDay = new Map(summaries.map((s) => [s.day, s.water_ml ?? 0]));
    const base = new Date();
    const days: { label: string; ml: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ label: WD[d.getUTCDay()], ml: byDay.get(key) ?? 0 });
    }
    const logged = days.filter((d) => d.ml > 0);
    const avgMl = logged.length ? Math.round(logged.reduce((s, d) => s + d.ml, 0) / logged.length) : 0;
    return { days, avgMl, anyLogged: logged.length > 0 };
  }, [summaries]);

  const hydrationBars: StackedBar[] = useMemo(
    () => hydration.days.map((d) => ({ label: d.label, segments: { water: d.ml } })),
    [hydration]
  );

  // ---- Derived strength 1RM series ----------------------------------------
  const oneRmSeries = useMemo(
    () => exerciseHistory.map((h) => estimateOneRepMax(h.bestWeightKg, h.bestReps)),
    [exerciseHistory]
  );
  const oneRmTrend = trendDirection(oneRmSeries);
  const latestOneRm = oneRmSeries.length ? oneRmSeries[oneRmSeries.length - 1] : 0;

  // ---- Weekly volume bars --------------------------------------------------
  const volumeBars: StackedBar[] = useMemo(
    () =>
      volumeWeeks.map((w) => ({
        label: w.weekStart.slice(5), // MM-DD
        segments: w.volumes as Record<string, number>,
      })),
    [volumeWeeks]
  );
  const muscleColors: Record<string, string> = useMemo(
    () => ({
      legs: t.colors.accent,
      back: t.colors.protein,
      chest: t.colors.energy,
      shoulders: t.colors.carbs,
      arms: t.colors.water,
      forearms: t.colors.fat,
      core: t.colors.success,
      full_body: t.colors.warning,
      cardio: t.colors.danger,
    }),
    [t]
  );

  // ---- Weight trend --------------------------------------------------------
  const weightSeries = useMemo(
    () => weights.map((w) => displayWeight(w.weight_kg, unit)),
    [weights, unit]
  );

  const measurementSeries = useMemo(() => {
    const filtered = measurements.filter((m) => m.metric_type === measureType);
    return filtered.map((m) => m.value_cm);
  }, [measurements, measureType]);

  // ---- Actions -------------------------------------------------------------
  const onLogMeasurement = async () => {
    if (!user || savingMeasure) return;
    const value = parseFloat(measureValue);
    if (!Number.isFinite(value) || value <= 0) {
      showToast('Enter a valid measurement', 'error');
      return;
    }
    setSavingMeasure(true);
    try {
      await logMeasurement(user.id, measureType, value);
      setMeasureValue('');
      showToast(`${measureType} logged`);
      setMeasurements(await fetchMeasurements(user.id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save', 'error');
    } finally {
      setSavingMeasure(false);
    }
  };

  const onAddPhoto = async () => {
    if (!user || uploadingPhoto) return;
    setUploadingPhoto(true);
    try {
      const path = await pickAndUploadImage('progress-photos', user.id, 'progress');
      if (path) {
        await addProgressPhoto(user.id, path);
        showToast('Progress photo added');
        setPhotos(await fetchProgressPhotos(user.id));
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={t.colors.accentEmphasis} />
      </ScreenContainer>
    );
  }

  const firstPhoto = photos[0];
  const lastPhoto = photos.length > 1 ? photos[photos.length - 1] : null;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        {/* ---- Weekly recap ---- */}
        <Text style={styles.sectionTitle}>This week</Text>
        <View style={styles.recapGrid}>
          <RecapTile
            icon={Flame}
            color={t.colors.energy}
            value={`${recap.streak}`}
            label={`day streak`}
            styles={styles}
          />
          <RecapTile
            icon={Dumbbell}
            color={t.colors.accentEmphasis}
            value={`${recap.workouts}`}
            label="workouts"
            styles={styles}
          />
          <RecapTile
            icon={Activity}
            color={t.colors.protein}
            value={recap.thisWeekVol >= 1000 ? `${Math.round(recap.thisWeekVol / 1000)}k` : `${Math.round(recap.thisWeekVol)}`}
            label="volume"
            styles={styles}
          />
          <RecapTile
            icon={BarChart3}
            color={t.colors.success}
            value={recap.adherence == null ? '—' : `${recap.adherence}%`}
            label="adherence"
            styles={styles}
          />
        </View>

        {/* ---- Hydration ---- */}
        <Text style={styles.sectionTitle}>Hydration</Text>
        <Card style={styles.card}>
          {hydration.anyLogged ? (
            <>
              <Text style={styles.hydrationAvg}>
                {(hydration.avgMl / 1000).toFixed(1)} L
                <Text style={styles.hydrationAvgLabel}>  avg / logged day</Text>
              </Text>
              <View style={styles.hydrationChart}>
                <StackedBarChart
                  bars={hydrationBars}
                  segmentOrder={['water']}
                  colors={{ water: t.colors.water }}
                  height={140}
                  formatTotal={(v) => `${(v / 1000).toFixed(1)}L`}
                />
              </View>
            </>
          ) : (
            <EmptyState icon={Droplet} title="No water logged yet" message="Add water from the Home or Nutrition tab to see your hydration trend." />
          )}
        </Card>

        {/* ---- Strength progress ---- */}
        <Text style={styles.sectionTitle}>Strength progress</Text>
        <Card style={styles.card}>
          {exercises.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="No lifts logged yet"
              message="Log a few weighted sets and your estimated 1RM trend shows up here."
            />
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {exercises.map((ex) => (
                  <Chip
                    key={ex.id}
                    label={ex.name}
                    selected={ex.id === selectedExercise}
                    onPress={() => setSelectedExercise(ex.id)}
                  />
                ))}
              </ScrollView>
              {oneRmSeries.length >= 2 ? (
                <>
                  <View style={styles.rowBetween}>
                    <View>
                      <Text style={styles.bigStat}>
                        {displayWeight(latestOneRm, unit)}
                        <Text style={styles.unit}> {weightUnitLabel(unit)}</Text>
                      </Text>
                      <Text style={styles.caption}>estimated 1RM</Text>
                    </View>
                    <TrendBadge trend={oneRmTrend} />
                  </View>
                  <Sparkline
                    values={oneRmSeries}
                    color={t.colors.accentEmphasis}
                    formatValue={(v) => `${displayWeight(v, unit)}`}
                  />
                </>
              ) : (
                <Text style={styles.hint}>
                  Log this exercise across at least two sessions to see a trend.
                </Text>
              )}
            </>
          )}
        </Card>

        {/* ---- Weekly volume by muscle group ---- */}
        <Text style={styles.sectionTitle}>Weekly volume</Text>
        <Card style={styles.card}>
          {volumeBars.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No volume yet"
              message="Your training volume by muscle group appears here once you log sets."
            />
          ) : (
            <>
              <Text style={styles.caption}>Total load (weight × reps) per week, split by muscle group.</Text>
              <View style={{ marginTop: t.spacing.md }}>
                <StackedBarChart
                  bars={volumeBars}
                  segmentOrder={VOLUME_MUSCLE_ORDER}
                  colors={muscleColors}
                />
              </View>
            </>
          )}
        </Card>

        {/* ---- Body weight trend ---- */}
        <Text style={styles.sectionTitle}>Body weight</Text>
        <Card style={styles.card}>
          {weightSeries.length >= 2 ? (
            <>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.bigStat}>
                    {weightSeries[weightSeries.length - 1]}
                    <Text style={styles.unit}> {weightUnitLabel(unit)}</Text>
                  </Text>
                  <Text style={styles.caption}>latest weigh-in</Text>
                </View>
                <TrendBadge trend={trendDirection(weightSeries)} />
              </View>
              <Sparkline
                values={weightSeries}
                color={t.colors.protein}
                formatValue={(v) => `${Math.round(v * 10) / 10}`}
              />
            </>
          ) : (
            <Text style={styles.hint}>
              Log your weight from the Home screen to build a trend line.
            </Text>
          )}
        </Card>

        {/* ---- Body measurements ---- */}
        <Text style={styles.sectionTitle}>Measurements</Text>
        <Card style={styles.card}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {MEASUREMENT_TYPES.map((m) => (
              <Chip
                key={m}
                label={m}
                selected={m === measureType}
                onPress={() => setMeasureType(m)}
              />
            ))}
          </ScrollView>
          {measurementSeries.length >= 2 && (
            <Sparkline
              values={measurementSeries}
              color={t.colors.water}
              formatValue={(v) => `${Math.round(v * 10) / 10}cm`}
            />
          )}
          <View style={styles.measureRow}>
            <View style={styles.measureInput}>
              <NumberInput
                label={`${measureType} (cm)`}
                value={measureValue}
                onChangeText={setMeasureValue}
                step={0.5}
                decimals={1}
                min={0}
                placeholder="0"
              />
            </View>
            <Button
              label="Log"
              icon={Ruler}
              onPress={onLogMeasurement}
              loading={savingMeasure}
              style={styles.measureBtn}
            />
          </View>
        </Card>

        {/* ---- Progress photos ---- */}
        <Text style={styles.sectionTitle}>Progress photos</Text>
        <Card style={styles.card}>
          {photos.length === 0 ? (
            <EmptyState
              icon={Ruler}
              title="No photos yet"
              message="Add a photo now and again to see your before/after side by side."
              ctaLabel={uploadingPhoto ? 'Uploading…' : 'Add photo'}
              onCtaPress={onAddPhoto}
            />
          ) : (
            <>
              <View style={styles.photoRow}>
                <View style={styles.photoCol}>
                  <Text style={styles.photoLabel}>Before</Text>
                  <Image
                    source={{ uri: publicImageUrl('progress-photos', firstPhoto.storage_path) ?? undefined }}
                    style={styles.photo}
                  />
                  <Text style={styles.photoDate}>{firstPhoto.taken_at.slice(0, 10)}</Text>
                </View>
                <View style={styles.photoCol}>
                  <Text style={styles.photoLabel}>{lastPhoto ? 'Latest' : 'Only photo'}</Text>
                  <Image
                    source={{
                      uri:
                        publicImageUrl('progress-photos', (lastPhoto ?? firstPhoto).storage_path) ??
                        undefined,
                    }}
                    style={styles.photo}
                  />
                  <Text style={styles.photoDate}>{(lastPhoto ?? firstPhoto).taken_at.slice(0, 10)}</Text>
                </View>
              </View>
              <Button
                label={uploadingPhoto ? 'Uploading…' : 'Add photo'}
                variant="secondary"
                onPress={onAddPhoto}
                loading={uploadingPhoto}
                style={{ marginTop: t.spacing.md }}
              />
            </>
          )}
        </Card>

        {/* ---- Badges ---- */}
        <Text style={styles.sectionTitle}>Badges</Text>
        <Card style={styles.card}>
          <View style={styles.badgeShelf}>
            {ACHIEVEMENTS.map((a) => {
              const earned = unlocked.includes(a.key);
              return (
                <View key={a.key} style={[styles.badge, !earned && styles.badgeLocked]}>
                  <Text style={styles.badgeEmoji}>{a.emoji}</Text>
                  <Text style={styles.badgeTitle} numberOfLines={1}>
                    {a.title}
                  </Text>
                  <Text style={styles.badgeDesc} numberOfLines={2}>
                    {earned ? a.description : 'Locked'}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        <View style={styles.footerIcon}>
          <Trophy size={16} color={t.colors.textTertiary} />
          <Text style={styles.footerText}>
            {unlocked.length}/{ACHIEVEMENTS.length} badges earned
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function RecapTile({
  icon: Icon,
  color,
  value,
  label,
  styles,
}: {
  icon: typeof Flame;
  color: string;
  value: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.recapTile}>
      <Icon size={20} color={color} />
      <Text style={styles.recapValue}>{value}</Text>
      <Text style={styles.recapLabel}>{label}</Text>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    center: { alignItems: 'center', justifyContent: 'center' },
    container: { padding: t.spacing.xl, paddingBottom: t.spacing.xxl },
    sectionTitle: {
      ...t.typography.h3,
      color: t.colors.textPrimary,
      marginTop: t.spacing.xl,
      marginBottom: t.spacing.md,
    },
    card: { gap: t.spacing.sm },
    hydrationAvg: { ...t.typography.statSmall, color: t.colors.water },
    hydrationAvgLabel: { ...t.typography.caption, color: t.colors.textSecondary },
    hydrationChart: { marginTop: t.spacing.sm },
    recapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.md },
    recapTile: {
      flexGrow: 1,
      flexBasis: '45%',
      backgroundColor: t.colors.surface,
      borderRadius: t.radii.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      padding: t.spacing.lg,
      gap: 4,
    },
    recapValue: { ...t.typography.h2, color: t.colors.textPrimary },
    recapLabel: { ...t.typography.caption, color: t.colors.textSecondary },
    chipRow: { gap: t.spacing.sm, paddingVertical: t.spacing.xs, paddingRight: t.spacing.md },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: t.spacing.sm,
    },
    bigStat: { ...t.typography.h1, color: t.colors.textPrimary },
    unit: { ...t.typography.body, color: t.colors.textSecondary },
    caption: { ...t.typography.caption, color: t.colors.textSecondary },
    hint: { ...t.typography.body, color: t.colors.textTertiary, paddingVertical: t.spacing.md },
    measureRow: { flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing.md, marginTop: t.spacing.sm },
    measureInput: { flex: 1 },
    measureBtn: { minWidth: 88 },
    photoRow: { flexDirection: 'row', gap: t.spacing.md },
    photoCol: { flex: 1, gap: 4 },
    photoLabel: { ...t.typography.caption, color: t.colors.textSecondary, fontWeight: '600' },
    photo: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: t.radii.lg,
      backgroundColor: t.colors.surfaceElevated,
    },
    photoDate: { ...t.typography.caption, color: t.colors.textTertiary },
    badgeShelf: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.md },
    badge: {
      flexGrow: 1,
      flexBasis: '28%',
      alignItems: 'center',
      padding: t.spacing.md,
      borderRadius: t.radii.lg,
      backgroundColor: t.colors.surfaceElevated,
      gap: 2,
    },
    badgeLocked: { opacity: 0.4 },
    badgeEmoji: { fontSize: 26 },
    badgeTitle: { ...t.typography.caption, color: t.colors.textPrimary, fontWeight: '700', textAlign: 'center' },
    badgeDesc: { ...t.typography.caption, color: t.colors.textTertiary, textAlign: 'center', fontSize: 10 },
    footerIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: t.spacing.lg,
    },
    footerText: { ...t.typography.caption, color: t.colors.textTertiary },
  });
}
