import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { Dumbbell, PersonStanding } from "lucide-react-native";
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WorkoutsStackParamList } from '../../navigation/types';
import { fetchExerciseById } from '../../services/workouts';
import ScreenContainer from '../../components/ScreenContainer';
import { Card } from '../../components/ui';
import { Button } from '../../components/ui';
import { Theme, useTheme, useThemedStyles } from '../../theme';
import type { Exercise } from '../../types/database';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'ExerciseDetail'>;

function youtubeSearchUrl(exerciseName: string): string {
  const query = `${exerciseName} exercise proper form tutorial`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export default function ExerciseDetailScreen({ route }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { exerciseId } = route.params;
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExerciseById(exerciseId)
      .then(setExercise)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load exercise'))
      .finally(() => setLoading(false));
  }, [exerciseId]);

  if (loading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={t.colors.accent} />
      </ScreenContainer>
    );
  }

  if (error || !exercise) {
    return (
      <ScreenContainer style={styles.center}>
        <Text style={styles.error}>{error ?? 'Exercise not found.'}</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.name}>{exercise.name}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <PersonStanding size={14} color={t.colors.accent} />
            <Text style={styles.badgeText}>{exercise.muscle_group.replace('_', ' ')}</Text>
          </View>
          {exercise.equipment ? (
            <View style={styles.badge}>
              <Dumbbell size={14} color={t.colors.accent} />
              <Text style={styles.badgeText}>{exercise.equipment}</Text>
            </View>
          ) : null}
        </View>

        <Button
          label="Watch tutorial"
          variant="secondary"
          onPress={() => Linking.openURL(youtubeSearchUrl(exercise.name))}
          style={styles.videoButton}
        />

        {exercise.instructions ? (
          <Card style={styles.instructionsCard}>
            <Text style={styles.instructionsLabel}>How to do it</Text>
            <Text style={styles.instructionsText}>{exercise.instructions}</Text>
          </Card>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  container: { padding: t.spacing.xxl },
  name: { ...t.typography.h1, color: t.colors.textPrimary, marginBottom: t.spacing.md },
  badgeRow: { flexDirection: 'row', gap: t.spacing.sm, marginBottom: t.spacing.xl },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.radii.full,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
  },
  badgeText: { ...t.typography.caption, color: t.colors.textPrimary, textTransform: 'capitalize' },
  videoButton: { marginBottom: t.spacing.xl },
  instructionsCard: {},
  instructionsLabel: { ...t.typography.label, color: t.colors.textSecondary, textTransform: 'uppercase', marginBottom: t.spacing.sm },
  instructionsText: { ...t.typography.body, color: t.colors.textPrimary, lineHeight: 22 },
  error: { color: t.colors.danger, ...t.typography.body },
});
}
