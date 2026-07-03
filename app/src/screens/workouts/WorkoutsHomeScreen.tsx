import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { WorkoutsStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { fetchRoutines, seedStandardPlan } from '../../services/workouts';
import { DAY_LABELS, DAY_LABELS_SHORT } from '../../constants/workoutTemplates';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme/theme';
import type { Workout } from '../../types/database';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutsHome'>;

const TODAY_WEEKDAY = new Date().getDay();

export default function WorkoutsHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [routines, setRoutines] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    fetchRoutines(user.id)
      .then(setRoutines)
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

  const onUseStandardPlan = async () => {
    if (!user) return;
    setSeeding(true);
    setError(null);
    try {
      await seedStandardPlan(user.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set up standard plan');
    } finally {
      setSeeding(false);
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
      <ScrollView contentContainerStyle={styles.container}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card style={styles.todayCard} highlighted={!!todayRoutine}>
          <Text style={styles.todayLabel}>{DAY_LABELS[TODAY_WEEKDAY]}</Text>
          {todayRoutine ? (
            <>
              <Text style={styles.todayName}>{todayRoutine.name}</Text>
              <Button
                label="Start workout"
                onPress={() => navigation.navigate('WorkoutSession', { workoutId: todayRoutine.id })}
                style={styles.todayButton}
              />
            </>
          ) : (
            <Text style={styles.restText}>Rest day — nothing scheduled.</Text>
          )}
        </Card>

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
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
              </Pressable>
            );
          })}
        </Card>

        {routines.length === 0 ? (
          <Button
            label="Use standard 5-day plan"
            onPress={onUseStandardPlan}
            loading={seeding}
            variant="secondary"
            style={styles.standardPlanButton}
          />
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
          <Ionicons name="add" size={20} color={COLORS.textPrimary} />
          <Text style={styles.newButtonText}>New routine</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  container: { padding: SPACING.lg, paddingBottom: 110 },
  todayCard: { marginBottom: SPACING.xl },
  todayLabel: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, textTransform: 'uppercase' },
  todayName: { ...TYPOGRAPHY.h1, color: COLORS.textPrimary, marginTop: SPACING.xs },
  restText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: SPACING.xs },
  todayButton: { marginTop: SPACING.lg },
  sectionTitle: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: SPACING.sm },
  weekCard: { padding: 0, marginBottom: SPACING.lg, overflow: 'hidden' },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  weekRowToday: { backgroundColor: COLORS.accentMuted },
  weekDay: { ...TYPOGRAPHY.bodyBold, color: COLORS.textSecondary, width: 44 },
  weekDayToday: { color: COLORS.accent },
  weekRoutine: { ...TYPOGRAPHY.body, color: COLORS.textPrimary, flex: 1 },
  weekRoutineEmpty: { color: COLORS.textTertiary },
  standardPlanButton: { marginBottom: SPACING.lg },
  card: { marginBottom: SPACING.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary },
  dayBadge: {
    backgroundColor: COLORS.surfaceHigh,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  dayBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary },
  startButton: { marginTop: SPACING.md },
  newButtonWrap: { position: 'absolute', bottom: SPACING.xl, left: SPACING.lg, right: SPACING.lg },
  newButton: {
    flexDirection: 'row',
    gap: SPACING.xs,
    backgroundColor: COLORS.surfaceHigh,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newButtonText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 15 },
  error: { color: COLORS.danger, marginBottom: SPACING.md, ...TYPOGRAPHY.caption },
});
