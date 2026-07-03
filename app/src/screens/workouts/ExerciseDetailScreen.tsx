import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WorkoutsStackParamList } from '../../navigation/types';
import { fetchExerciseById } from '../../services/workouts';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme/theme';
import type { Exercise } from '../../types/database';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'ExerciseDetail'>;

function youtubeSearchUrl(exerciseName: string): string {
  const query = `${exerciseName} exercise proper form tutorial`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export default function ExerciseDetailScreen({ route }: Props) {
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
        <ActivityIndicator size="large" color={COLORS.accent} />
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
            <Ionicons name="body-outline" size={14} color={COLORS.accent} />
            <Text style={styles.badgeText}>{exercise.muscle_group.replace('_', ' ')}</Text>
          </View>
          {exercise.equipment ? (
            <View style={styles.badge}>
              <Ionicons name="barbell-outline" size={14} color={COLORS.accent} />
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

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  container: { padding: SPACING.xxl },
  name: { ...TYPOGRAPHY.h1, color: COLORS.textPrimary, marginBottom: SPACING.md },
  badgeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  badgeText: { ...TYPOGRAPHY.caption, color: COLORS.textPrimary, textTransform: 'capitalize' },
  videoButton: { marginBottom: SPACING.xl },
  instructionsCard: {},
  instructionsLabel: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: SPACING.sm },
  instructionsText: { ...TYPOGRAPHY.body, color: COLORS.textPrimary, lineHeight: 22 },
  error: { color: COLORS.danger, ...TYPOGRAPHY.body },
});
