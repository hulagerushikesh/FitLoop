import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { History, Sparkles, Trash2 } from "lucide-react-native";
import type { NutritionStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { fetchDailyLogs, deleteFoodLog } from '../../services/nutrition';
import { fetchLatestGoal } from '../../services/goals';
import ScreenContainer from '../../components/ScreenContainer';
import { Card } from '../../components/ui';
import { Button } from '../../components/ui';
import ProgressBar from '../../components/ProgressBar';
import { MEAL_TYPE_OPTIONS } from '../../constants/nutritionOptions';
import { FONTS, Theme, useTheme, useThemedStyles } from '../../theme';
import type { FoodLog, Goal, MealType } from '../../types/database';

type Props = NativeStackScreenProps<NutritionStackParamList, 'NutritionHome'>;

const SOURCE_BADGE: Record<FoodLog['source'], boolean> = {
  manual: false,
  food_item: false,
  ai_text: true,
  ai_photo: true,
};

export default function NutritionHomeScreen({ navigation }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
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
          <History size={22} color={t.colors.textPrimary} />
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
        <ActivityIndicator size="large" color={t.colors.accent} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {goal ? (
          <Card style={styles.progressCard}>
            <ProgressBar label="Calories" current={totals.calories} target={goal.calorie_target} unit=" kcal" color={t.colors.accent} />
            <ProgressBar label="Protein" current={totals.protein_g} target={goal.protein_g} unit="g" color={t.colors.protein} />
            <ProgressBar label="Carbs" current={totals.carbs_g} target={goal.carbs_g} unit="g" color={t.colors.carbs} />
            <ProgressBar label="Fat" current={totals.fat_g} target={goal.fat_g} unit="g" color={t.colors.fat} />
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
                          <Sparkles size={10} color={t.colors.onAccent} />
                          <Text style={styles.aiBadgeText}>AI</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.logMacros}>
                      {log.calories} kcal · {log.protein_g}p / {log.carbs_g}c / {log.fat_g}f
                    </Text>
                  </View>
                  <Pressable onPress={() => onDelete(log.id)} style={styles.deleteButton}>
                    <Trash2 size={18} color={t.colors.danger} />
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

function createStyles(t: Theme) {
  return StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  container: { padding: t.spacing.lg, paddingBottom: 110 },
  progressCard: { marginBottom: t.spacing.sm },
  noGoal: { color: t.colors.textSecondary, marginBottom: t.spacing.lg, ...t.typography.body },
  section: { marginTop: t.spacing.xl },
  sectionTitle: { ...t.typography.label, color: t.colors.textSecondary, marginBottom: t.spacing.sm, textTransform: 'uppercase' },
  emptyMeal: { color: t.colors.textTertiary, ...t.typography.caption },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  logInfo: { flex: 1, marginRight: t.spacing.sm },
  logNameRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  logName: { ...t.typography.bodyBold, color: t.colors.textPrimary, flexShrink: 1 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: t.colors.accent,
    borderRadius: t.radii.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiBadgeText: { fontSize: 10, fontFamily: FONTS.extrabold, color: t.colors.onAccent },
  logMacros: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: 2 },
  deleteButton: { padding: t.spacing.sm },
  logButtonWrap: { position: 'absolute', bottom: t.spacing.xl, left: t.spacing.lg, right: t.spacing.lg },
  historyButton: { padding: t.spacing.xs },
  error: { color: t.colors.danger, marginBottom: t.spacing.md, ...t.typography.caption },
});
}
