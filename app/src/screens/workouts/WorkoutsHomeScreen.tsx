import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Check, ChevronRight, Plus, Sparkles } from 'lucide-react-native';
import type { WorkoutsStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { fetchRoutines, fetchRoutineMuscleGroups, seedPersonalizedPlan } from '../../services/workouts';
import { DAY_LABELS, DAY_LABELS_SHORT, MUSCLE_GROUP_OPTIONS } from '../../constants/workoutTemplates';
import ScreenContainer from '../../components/ScreenContainer';
import BodyDiagram from '../../components/BodyDiagram';
import { Button, Card, Chip, SkeletonCard } from '../../components/ui';
import { FONTS, Theme, useTheme, useThemedStyles } from '../../theme';
import type { MuscleGroup, Workout } from '../../types/database';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutsHome'>;

const TODAY_WEEKDAY = new Date().getDay();

const GROUP_LABEL = new Map(MUSCLE_GROUP_OPTIONS.map((o) => [o.value, o.label]));

export default function WorkoutsHomeScreen({ navigation }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const { profile } = useProfile();
  const [routines, setRoutines] = useState<Workout[]>([]);
  const [groupsByRoutine, setGroupsByRoutine] = useState<Map<string, MuscleGroup[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickId, setPickId] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchRoutines(user.id), fetchRoutineMuscleGroups(user.id).catch(() => [])])
      .then(([rs, groups]) => {
        setRoutines(rs);
        setGroupsByRoutine(new Map(groups.map((g) => [g.id, g.muscleGroups])));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load routines'))
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const scheduleByDay = useMemo(() => {
    const map = new Map<number, Workout>();
    for (const r of routines) {
      if (r.day_of_week != null) map.set(r.day_of_week, r);
    }
    return map;
  }, [routines]);

  const todayRoutine = scheduleByDay.get(TODAY_WEEKDAY) ?? null;
  // What the user has chosen to train today (defaults to the scheduled routine).
  const pick = useMemo(
    () => routines.find((r) => r.id === pickId) ?? todayRoutine,
    [routines, pickId, todayRoutine]
  );
  const pickGroups = pick ? groupsByRoutine.get(pick.id) ?? [] : [];

  const onGeneratePlan = async () => {
    if (!user || !profile?.goal_type || !profile?.activity_level || !profile?.sex) return;
    setSeeding(true);
    setError(null);
    try {
      await seedPersonalizedPlan(user.id, {
        goalType: profile.goal_type,
        activityLevel: profile.activity_level,
        sex: profile.sex,
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate your plan');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <SkeletonCard />
          <SkeletonCard style={{ marginTop: t.spacing.lg }} />
          <SkeletonCard style={{ marginTop: t.spacing.lg }} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* ---- Today's workout ---- */}
        <Card style={styles.todayCard} highlighted={!!pick}>
          <Text style={styles.todayLabel}>{DAY_LABELS[TODAY_WEEKDAY]}</Text>
          {pick ? (
            <>
              <Text style={styles.todayName}>{pick.name}</Text>

              {pickGroups.length > 0 ? (
                <>
                  <BodyDiagram active={pickGroups} />
                  <View style={styles.groupRow}>
                    {pickGroups
                      .filter((g) => g !== 'cardio' || pickGroups.length === 1)
                      .map((g) => (
                        <Chip key={g} label={GROUP_LABEL.get(g) ?? g} style={styles.groupChip} />
                      ))}
                  </View>
                </>
              ) : (
                <Text style={styles.restText}>No exercises yet — add some in the routine.</Text>
              )}

              <Button
                label="Start workout"
                onPress={() => navigation.navigate('WorkoutSession', { workoutId: pick.id })}
                style={styles.todayButton}
              />
            </>
          ) : (
            <Text style={styles.restText}>Rest day — nothing scheduled.</Text>
          )}

          {routines.length > 0 ? (
            <Pressable style={styles.chooseToggle} onPress={() => setChoosing((v) => !v)}>
              <Text style={styles.chooseToggleText}>
                {pick ? 'Choose a different workout' : 'Pick a workout for today'}
              </Text>
              <ChevronRight
                size={16}
                color={t.colors.accentEmphasis}
                style={{ transform: [{ rotate: choosing ? '90deg' : '0deg' }] }}
              />
            </Pressable>
          ) : null}

          {choosing ? (
            <View style={styles.chooseList}>
              {routines.map((r) => {
                const selected = pick?.id === r.id;
                return (
                  <Pressable
                    key={r.id}
                    style={[styles.chooseRow, selected && styles.chooseRowActive]}
                    onPress={() => {
                      setPickId(r.id);
                      setChoosing(false);
                    }}
                  >
                    <Text style={styles.chooseName}>{r.name}</Text>
                    {selected ? <Check size={16} color={t.colors.accentEmphasis} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </Card>

        {/* ---- Weekly schedule ---- */}
        <Text style={styles.sectionTitle}>This week</Text>
        <Card style={styles.weekCard}>
          {DAY_LABELS_SHORT.map((label, i) => {
            const routine = scheduleByDay.get(i);
            const isToday = i === TODAY_WEEKDAY;
            return (
              <Pressable
                key={label}
                style={[styles.weekRow, isToday && styles.weekRowToday]}
                onPress={() =>
                  routine
                    ? navigation.navigate('RoutineBuilder', { workoutId: routine.id })
                    : navigation.navigate('RoutineBuilder', { initialDayOfWeek: i })
                }
              >
                <Text style={[styles.weekDay, isToday && styles.weekDayToday]}>{label}</Text>
                <Text style={[styles.weekRoutine, !routine && styles.weekRoutineEmpty]}>
                  {routine ? routine.name : 'Rest day'}
                </Text>
                <ChevronRight size={16} color={t.colors.textTertiary} />
              </Pressable>
            );
          })}
        </Card>

        {routines.length === 0 ? (
          <Button
            label="Generate my personalized plan"
            onPress={onGeneratePlan}
            loading={seeding}
            style={styles.standardPlanButton}
          />
        ) : null}
        {routines.length === 0 ? (
          <View style={styles.planHint}>
            <Sparkles size={14} color={t.colors.accentEmphasis} />
            <Text style={styles.planHintText}>Built from your goal and activity level.</Text>
          </View>
        ) : null}

        {routines.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>All routines</Text>
            {routines.map((item) => (
              <Pressable key={item.id} onPress={() => navigation.navigate('RoutineBuilder', { workoutId: item.id })}>
                <Card style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    {item.day_of_week != null ? (
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>{DAY_LABELS_SHORT[item.day_of_week]}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Button
                    label="Start workout"
                    onPress={() => navigation.navigate('WorkoutSession', { workoutId: item.id })}
                    style={styles.startButton}
                  />
                </Card>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>

      <View style={styles.newButtonWrap}>
        <Pressable style={styles.newButton} onPress={() => navigation.navigate('RoutineBuilder', undefined)}>
          <Plus size={20} color={t.colors.textPrimary} />
          <Text style={styles.newButtonText}>New routine</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    center: { alignItems: 'center', justifyContent: 'center' },
    container: { padding: t.spacing.lg, paddingBottom: 110 },
    todayCard: { marginBottom: t.spacing.xl },
    todayLabel: { ...t.typography.label, color: t.colors.textSecondary, textTransform: 'uppercase' },
    todayName: { ...t.typography.h1, color: t.colors.textPrimary, marginTop: t.spacing.xs, marginBottom: t.spacing.md },
    restText: { ...t.typography.body, color: t.colors.textSecondary, marginTop: t.spacing.xs },
    groupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs, justifyContent: 'center', marginTop: t.spacing.md },
    groupChip: { minHeight: 30, paddingVertical: 2 },
    todayButton: { marginTop: t.spacing.lg },
    chooseToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginTop: t.spacing.md,
    },
    chooseToggleText: { ...t.typography.caption, color: t.colors.accentEmphasis, fontFamily: FONTS.bold },
    chooseList: { marginTop: t.spacing.sm, borderTopWidth: 1, borderTopColor: t.colors.border },
    chooseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: t.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    chooseRowActive: {},
    chooseName: { ...t.typography.body, color: t.colors.textPrimary },
    sectionTitle: { ...t.typography.label, color: t.colors.textSecondary, textTransform: 'uppercase', marginBottom: t.spacing.sm },
    weekCard: { padding: 0, marginBottom: t.spacing.lg, overflow: 'hidden' },
    weekRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: t.spacing.md,
      paddingHorizontal: t.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    weekRowToday: { backgroundColor: t.colors.accentMuted },
    weekDay: { ...t.typography.bodyBold, color: t.colors.textSecondary, width: 44 },
    weekDayToday: { color: t.colors.accentEmphasis },
    weekRoutine: { ...t.typography.body, color: t.colors.textPrimary, flex: 1 },
    weekRoutineEmpty: { color: t.colors.textTertiary },
    standardPlanButton: { marginBottom: t.spacing.sm },
    planHint: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, justifyContent: 'center', marginBottom: t.spacing.lg },
    planHintText: { ...t.typography.caption, color: t.colors.textSecondary },
    card: { marginBottom: t.spacing.md },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { ...t.typography.h3, color: t.colors.textPrimary },
    dayBadge: {
      backgroundColor: t.colors.surfaceElevated,
      paddingHorizontal: t.spacing.sm,
      paddingVertical: 3,
      borderRadius: t.radii.full,
    },
    dayBadgeText: { fontSize: 10, fontFamily: FONTS.extrabold, color: t.colors.textSecondary },
    startButton: { marginTop: t.spacing.md },
    newButtonWrap: { position: 'absolute', bottom: t.spacing.xl, left: t.spacing.lg, right: t.spacing.lg },
    newButton: {
      flexDirection: 'row',
      gap: t.spacing.xs,
      backgroundColor: t.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radii.full,
      paddingVertical: t.spacing.md + 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    newButtonText: { color: t.colors.textPrimary, fontFamily: FONTS.bold, fontSize: 15 },
    error: { color: t.colors.danger, marginBottom: t.spacing.md, ...t.typography.caption },
  });
}
