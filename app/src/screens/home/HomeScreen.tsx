import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, Dumbbell, Flame, UtensilsCrossed } from 'lucide-react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { HomeStackParamList, MainTabParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { fetchDailyLogs } from '../../services/nutrition';
import { fetchLatestGoal } from '../../services/goals';
import { fetchRoutines } from '../../services/workouts';
import ScreenContainer from '../../components/ScreenContainer';
import { Card, CountUp, ProgressRing, SkeletonCard } from '../../components/ui';
import ProgressBar from '../../components/ProgressBar';
import { Theme, useTheme, useThemedStyles } from '../../theme';
import type { FoodLog, Goal, Workout } from '../../types/database';

type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'HomeMain'>,
  BottomTabScreenProps<MainTabParamList>
>;

const TODAY_WEEKDAY = new Date().getDay();

export default function HomeScreen({ navigation }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const { profile } = useProfile();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [todayRoutine, setTodayRoutine] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchDailyLogs(user.id), fetchLatestGoal(user.id), fetchRoutines(user.id)])
      .then(([l, g, routines]) => {
        setLogs(l);
        setGoal(g);
        setTodayRoutine(routines.find((r) => r.day_of_week === TODAY_WEEKDAY) ?? null);
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

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.greeting}>Hey {firstName} 👋</Text>
        <Text style={styles.subGreeting}>Let's make today count.</Text>

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
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
  container: { padding: t.spacing.xxl, paddingBottom: 60 },
  greeting: { ...t.typography.h1, color: t.colors.textPrimary },
  subGreeting: { ...t.typography.body, color: t.colors.textSecondary, marginTop: t.spacing.xs, marginBottom: t.spacing.xxl },
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
});
}
