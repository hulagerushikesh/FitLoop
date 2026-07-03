import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { HomeStackParamList, MainTabParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { fetchDailyLogs } from '../../services/nutrition';
import { fetchLatestGoal } from '../../services/goals';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import ProgressBar from '../../components/ProgressBar';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme/theme';
import type { FoodLog, Goal } from '../../types/database';

type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'HomeMain'>,
  BottomTabScreenProps<MainTabParamList>
>;

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchDailyLogs(user.id), fetchLatestGoal(user.id)])
      .then(([l, g]) => {
        setLogs(l);
        setGoal(g);
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
          <ActivityIndicator color={COLORS.accent} style={styles.loader} />
        ) : goal ? (
          <Card style={styles.card} highlighted>
            <View style={styles.remainingRow}>
              <View>
                <Text style={styles.remainingLabel}>Calories remaining</Text>
                <Text style={styles.remainingValue}>{remaining}</Text>
              </View>
              <View style={styles.energyBadge}>
                <Ionicons name="flame" size={26} color={COLORS.energy} />
              </View>
            </View>
            <ProgressBar label="Calories" current={totals.calories} target={goal.calorie_target} unit=" kcal" color={COLORS.accent} />
            <ProgressBar label="Protein" current={totals.protein_g} target={goal.protein_g} unit="g" color={COLORS.protein} />
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
            onPress={() => navigation.navigate('Nutrition')}
          >
            <Ionicons name="restaurant" size={22} color={COLORS.accent} />
            <Text style={styles.actionLabel}>Log food</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => navigation.navigate('Workouts')}>
            <Ionicons name="barbell" size={22} color={COLORS.accent} />
            <Text style={styles.actionLabel}>Start workout</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => navigation.navigate('Calendar')}>
            <Ionicons name="calendar" size={22} color={COLORS.accent} />
            <Text style={styles.actionLabel}>Calendar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.xxl, paddingBottom: 60 },
  greeting: { ...TYPOGRAPHY.h1, color: COLORS.textPrimary },
  subGreeting: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.xxl },
  loader: { marginTop: SPACING.xxl },
  card: { marginBottom: SPACING.xl },
  remainingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  remainingLabel: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, textTransform: 'uppercase' },
  remainingValue: { ...TYPOGRAPHY.display, color: COLORS.textPrimary, marginTop: SPACING.xs },
  energyBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.energyMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary, marginBottom: SPACING.md },
  quickActions: { flexDirection: 'row', gap: SPACING.md },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionLabel: { ...TYPOGRAPHY.caption, color: COLORS.textPrimary, textAlign: 'center' },
});
