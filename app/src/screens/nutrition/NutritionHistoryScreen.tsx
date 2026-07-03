import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { fetchRecentSummary } from '../../services/nutrition';
import { fetchLatestGoal } from '../../services/goals';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme/theme';
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
        <ActivityIndicator size="large" color={COLORS.accent} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.streakCard} highlighted={streak > 0}>
          <View style={styles.streakIconWrap}>
            <Ionicons name="flame" size={22} color={COLORS.energy} />
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
                    <Ionicons name="checkmark" size={12} color={COLORS.accentText} />
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
                  <Ionicons name="barbell" size={12} color={COLORS.textSecondary} />
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

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  container: { padding: SPACING.lg, paddingBottom: 60 },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.xl },
  streakIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.energyMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakValue: { ...TYPOGRAPHY.h2, color: COLORS.textPrimary },
  streakLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  sectionTitle: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: SPACING.sm },
  dayCard: { marginBottom: SPACING.md },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  dayLabel: { ...TYPOGRAPHY.bodyBold, color: COLORS.textPrimary },
  hitBadge: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayRow: { flexDirection: 'row', alignItems: 'baseline' },
  dayCalories: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary },
  dayTarget: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  barTrack: { height: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceHigh, marginTop: SPACING.sm, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: RADIUS.full, backgroundColor: COLORS.accent },
  dayMacros: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: SPACING.sm },
  emptyText: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },
  workoutLine: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.sm },
  workoutLineText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
});
