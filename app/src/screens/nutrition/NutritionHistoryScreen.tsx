import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Check, Dumbbell, Flame } from "lucide-react-native";
import { useAuth } from '../../hooks/useAuth';
import { fetchRecentSummary } from '../../services/nutrition';
import { fetchLatestGoal } from '../../services/goals';
import ScreenContainer from '../../components/ScreenContainer';
import { Card } from '../../components/ui';
import { Theme, useTheme, useThemedStyles } from '../../theme';
import type { DailySummary, Goal } from '../../types/database';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function formatDay(day: string): string {
  if (day === todayString()) return 'Today';
  if (day === yesterdayString()) return 'Yesterday';
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAY_NAMES[date.getUTCDay()].slice(0, 3)}, ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

export default function NutritionHistoryScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const [days, setDays] = useState<DailySummary[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchRecentSummary(user.id, 30), fetchLatestGoal(user.id)])
      .then(([d, g]) => {
        setDays(d);
        setGoal(g);
      })
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const byDay = useMemo(() => new Map(days.map((d) => [d.day, d])), [days]);

  const streak = useMemo(() => {
    let count = 0;
    const cursor = new Date();
    // If nothing logged yet today, don't break the streak on today — start checking from yesterday.
    if (!byDay.get(todayString())?.calories_consumed) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      const entry = byDay.get(key);
      if (!entry || entry.calories_consumed <= 0) break;
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [byDay]);

  if (loading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={t.colors.accentEmphasis} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.streakCard} highlighted={streak > 0}>
          <View style={styles.streakIconWrap}>
            <Flame size={22} color={t.colors.energy} />
          </View>
          <View>
            <Text style={styles.streakValue}>{streak} day{streak === 1 ? '' : 's'}</Text>
            <Text style={styles.streakLabel}>Logging streak</Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Last 30 days</Text>
        {days.map((entry) => {
          const target = goal?.calorie_target ?? null;
          const pct = target ? Math.min(1, entry.calories_consumed / target) : 0;
          const hit = target != null && entry.calories_consumed > 0 && Math.abs(entry.calories_consumed - target) <= target * 0.1;
          return (
            <Card key={entry.day} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{formatDay(entry.day)}</Text>
                {hit ? (
                  <View style={styles.hitBadge}>
                    <Check size={12} color={t.colors.onAccent} />
                  </View>
                ) : null}
              </View>
              {entry.calories_consumed > 0 ? (
                <>
                  <View style={styles.dayRow}>
                    <Text style={styles.dayCalories}>{entry.calories_consumed} kcal</Text>
                    {target ? <Text style={styles.dayTarget}> / {target}</Text> : null}
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
                  </View>
                  <Text style={styles.dayMacros}>
                    {entry.protein_g}g protein · {entry.carbs_g}g carbs · {entry.fat_g}g fat
                  </Text>
                </>
              ) : (
                <Text style={styles.emptyText}>No food logged</Text>
              )}
              {entry.workout_count > 0 ? (
                <View style={styles.workoutLine}>
                  <Dumbbell size={12} color={t.colors.textSecondary} />
                  <Text style={styles.workoutLineText}>
                    {entry.workout_count} workout{entry.workout_count === 1 ? '' : 's'} · {entry.calories_burned} kcal burned
                  </Text>
                </View>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  container: { padding: t.spacing.lg, paddingBottom: 60 },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, marginBottom: t.spacing.xl },
  streakIconWrap: {
    width: 44,
    height: 44,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.energyMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakValue: { ...t.typography.h2, color: t.colors.textPrimary },
  streakLabel: { ...t.typography.caption, color: t.colors.textSecondary },
  sectionTitle: { ...t.typography.label, color: t.colors.textSecondary, textTransform: 'uppercase', marginBottom: t.spacing.sm },
  dayCard: { marginBottom: t.spacing.md },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.sm },
  dayLabel: { ...t.typography.bodyBold, color: t.colors.textPrimary },
  hitBadge: {
    width: 20,
    height: 20,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayRow: { flexDirection: 'row', alignItems: 'baseline' },
  dayCalories: { ...t.typography.h3, color: t.colors.textPrimary },
  dayTarget: { ...t.typography.caption, color: t.colors.textSecondary },
  barTrack: { height: 6, borderRadius: t.radii.full, backgroundColor: t.colors.surfaceElevated, marginTop: t.spacing.sm, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: t.radii.full, backgroundColor: t.colors.accent },
  dayMacros: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: t.spacing.sm },
  emptyText: { ...t.typography.caption, color: t.colors.textTertiary },
  workoutLine: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, marginTop: t.spacing.sm },
  workoutLineText: { ...t.typography.caption, color: t.colors.textSecondary },
});
}
