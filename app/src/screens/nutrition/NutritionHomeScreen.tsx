import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NutritionStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { fetchDailyLogs, deleteFoodLog } from '../../services/nutrition';
import { fetchLatestGoal } from '../../services/goals';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import ProgressBar from '../../components/ProgressBar';
import { MEAL_TYPE_OPTIONS } from '../../constants/nutritionOptions';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme/theme';
import type { FoodLog, Goal, MealType } from '../../types/database';

type Props = NativeStackScreenProps<NutritionStackParamList, 'NutritionHome'>;

const SOURCE_BADGE: Record<FoodLog['source'], boolean> = {
  manual: false,
  food_item: false,
  ai_text: true,
  ai_photo: true,
};

export default function NutritionHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchDailyLogs(user.id), fetchLatestGoal(user.id)])
      .then(([l, g]) => {
        setLogs(l);
        setGoal(g);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load nutrition log'))
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('NutritionHistory')} hitSlop={8} style={styles.historyButton}>
          <Ionicons name="time-outline" size={22} color={COLORS.textPrimary} />
        </Pressable>
      ),
    });
  }, [navigation]);

  const totals = useMemo(
    () =>
      logs.reduce(
        (acc, l) => ({
          calories: acc.calories + l.calories,
          protein_g: acc.protein_g + l.protein_g,
          carbs_g: acc.carbs_g + l.carbs_g,
          fat_g: acc.fat_g + l.fat_g,
        }),
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
      ),
    [logs]
  );

  const grouped = useMemo(() => {
    const groups: Record<MealType, FoodLog[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const log of logs) groups[log.meal_type].push(log);
    return groups;
  }, [logs]);

  const onDelete = async (id: string) => {
    try {
      await deleteFoodLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete entry');
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

        {goal ? (
          <Card style={styles.progressCard}>
            <ProgressBar label="Calories" current={totals.calories} target={goal.calorie_target} unit=" kcal" color={COLORS.accent} />
            <ProgressBar label="Protein" current={totals.protein_g} target={goal.protein_g} unit="g" color={COLORS.protein} />
            <ProgressBar label="Carbs" current={totals.carbs_g} target={goal.carbs_g} unit="g" color={COLORS.carbs} />
            <ProgressBar label="Fat" current={totals.fat_g} target={goal.fat_g} unit="g" color={COLORS.fat} />
          </Card>
        ) : (
          <Text style={styles.noGoal}>Finish onboarding to see targets here.</Text>
        )}

        {MEAL_TYPE_OPTIONS.map(({ value, label }) => (
          <View key={value} style={styles.section}>
            <Text style={styles.sectionTitle}>{label}</Text>
            {grouped[value].length === 0 ? (
              <Text style={styles.emptyMeal}>Nothing logged yet</Text>
            ) : (
              grouped[value].map((log) => (
                <View key={log.id} style={styles.logRow}>
                  <View style={styles.logInfo}>
                    <View style={styles.logNameRow}>
                      <Text style={styles.logName} numberOfLines={1}>
                        {log.name}
                      </Text>
                      {SOURCE_BADGE[log.source] ? (
                        <View style={styles.aiBadge}>
                          <Ionicons name="sparkles" size={10} color={COLORS.accentText} />
                          <Text style={styles.aiBadgeText}>AI</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.logMacros}>
                      {log.calories} kcal · {log.protein_g}p / {log.carbs_g}c / {log.fat_g}f
                    </Text>
                  </View>
                  <Pressable onPress={() => onDelete(log.id)} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        ))}
      </ScrollView>
      <View style={styles.logButtonWrap}>
        <Button label="+ Log food" onPress={() => navigation.navigate('LogMeal', undefined)} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  container: { padding: SPACING.lg, paddingBottom: 110 },
  progressCard: { marginBottom: SPACING.sm },
  noGoal: { color: COLORS.textSecondary, marginBottom: SPACING.lg, ...TYPOGRAPHY.body },
  section: { marginTop: SPACING.xl },
  sectionTitle: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, marginBottom: SPACING.sm, textTransform: 'uppercase' },
  emptyMeal: { color: COLORS.textTertiary, ...TYPOGRAPHY.caption },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logInfo: { flex: 1, marginRight: SPACING.sm },
  logNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  logName: { ...TYPOGRAPHY.bodyBold, color: COLORS.textPrimary, flexShrink: 1 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.accentText },
  logMacros: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
  deleteButton: { padding: SPACING.sm },
  logButtonWrap: { position: 'absolute', bottom: SPACING.xl, left: SPACING.lg, right: SPACING.lg },
  historyButton: { padding: SPACING.xs },
  error: { color: COLORS.danger, marginBottom: SPACING.md, ...TYPOGRAPHY.caption },
});
