import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronRight, Plus } from "lucide-react-native";
import type { WorkoutsStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { fetchRoutines, seedStandardPlan } from '../../services/workouts';
import { DAY_LABELS, DAY_LABELS_SHORT } from '../../constants/workoutTemplates';
import ScreenContainer from '../../components/ScreenContainer';
import { Card } from '../../components/ui';
import { Button } from '../../components/ui';
import { FONTS, Theme, useTheme, useThemedStyles } from '../../theme';
import type { Workout } from '../../types/database';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutsHome'>;

const TODAY_WEEKDAY = new Date().getDay();

export default function WorkoutsHomeScreen({ navigation }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
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
        <ActivityIndicator size="large" color={t.colors.accent} />
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
                <ChevronRight size={16} color={t.colors.textTertiary} />
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
  todayName: { ...t.typography.h1, color: t.colors.textPrimary, marginTop: t.spacing.xs },
  restText: { ...t.typography.body, color: t.colors.textSecondary, marginTop: t.spacing.xs },
  todayButton: { marginTop: t.spacing.lg },
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
  weekDayToday: { color: t.colors.accent },
  weekRoutine: { ...t.typography.body, color: t.colors.textPrimary, flex: 1 },
  weekRoutineEmpty: { color: t.colors.textTertiary },
  standardPlanButton: { marginBottom: t.spacing.lg },
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
