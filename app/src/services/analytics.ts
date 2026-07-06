import { supabase } from './supabase';
import { earnedAchievements, type AchievementStats } from '../engine/achievements';
import type { VolumeLogEntry } from '../engine/analytics';
import type { BodyMetric, MuscleGroup } from '../types/database';

export interface BodyMeasurement {
  id: string;
  user_id: string;
  metric_type: string;
  value_cm: number;
  recorded_at: string;
  created_at: string;
}

export interface ProgressPhoto {
  id: string;
  user_id: string;
  storage_path: string;
  taken_at: string;
  created_at: string;
}

/** Exercises the user has actually logged weighted sets for (for the picker). */
export async function fetchTrainedExercises(
  userId: string
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('exercise:exercises(id, name)')
    .eq('user_id', userId)
    .not('weight_kg', 'is', null)
    .limit(1000);
  if (error) throw error;
  const seen = new Map<string, string>();
  for (const row of (data ?? []) as unknown as { exercise: { id: string; name: string } | null }[]) {
    if (row.exercise) seen.set(row.exercise.id, row.exercise.name);
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}

/** Raw set logs (with muscle group) for the last `weeks` weeks. */
export async function fetchVolumeEntries(userId: string, weeks = 8): Promise<VolumeLogEntry[]> {
  const since = new Date(Date.now() - weeks * 7 * 24 * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from('workout_logs')
    .select('logged_at, weight_kg, reps, exercise:exercises(muscle_group)')
    .eq('user_id', userId)
    .gte('logged_at', since)
    .limit(5000);
  if (error) throw error;
  return ((data ?? []) as unknown as {
    logged_at: string;
    weight_kg: number | null;
    reps: number | null;
    exercise: { muscle_group: MuscleGroup } | null;
  }[])
    .filter((r) => r.exercise != null)
    .map((r) => ({
      loggedAt: r.logged_at,
      muscleGroup: r.exercise!.muscle_group,
      weightKg: r.weight_kg,
      reps: r.reps,
    }));
}

// ============================================================================
// Body measurements + progress photos + weight history
// ============================================================================

export async function fetchMeasurements(userId: string): Promise<BodyMeasurement[]> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BodyMeasurement[];
}

export async function logMeasurement(
  userId: string,
  metricType: string,
  valueCm: number
): Promise<void> {
  const { error } = await supabase.from('body_measurements').upsert(
    {
      user_id: userId,
      metric_type: metricType,
      value_cm: valueCm,
      recorded_at: new Date().toISOString().slice(0, 10),
    },
    { onConflict: 'user_id,metric_type,recorded_at' }
  );
  if (error) throw error;
}

export async function fetchWeightHistory(userId: string, limit = 60): Promise<BodyMetric[]> {
  const { data, error } = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as BodyMetric[];
}

export async function fetchProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProgressPhoto[];
}

export async function addProgressPhoto(userId: string, storagePath: string): Promise<void> {
  const { error } = await supabase
    .from('progress_photos')
    .insert({ user_id: userId, storage_path: storagePath });
  if (error) throw error;
}

// ============================================================================
// Achievements
// ============================================================================

export async function fetchUnlockedAchievements(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('key')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.key as string);
}

/**
 * Computes current stats, unlocks anything newly earned, and returns the
 * NEW keys so the caller can toast them. `hasPr` can be forced true by the
 * PR toast path (we don't persist PR events separately).
 */
export async function checkAndAwardAchievements(
  userId: string,
  options: { hasPr?: boolean; loggingStreak?: number } = {}
): Promise<string[]> {
  const [sessionsRes, foodRes, unlocked] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('ended_at', 'is', null),
    supabase
      .from('food_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    fetchUnlockedAchievements(userId),
  ]);

  const stats: AchievementStats = {
    completedWorkouts: sessionsRes.count ?? 0,
    foodLogs: foodRes.count ?? 0,
    loggingStreak: options.loggingStreak ?? 0,
    hasPr: options.hasPr ?? unlocked.includes('first_pr'),
  };

  const earned = earnedAchievements(stats);
  const fresh = earned.filter((key) => !unlocked.includes(key));
  if (fresh.length > 0) {
    await supabase
      .from('achievements')
      .upsert(fresh.map((key) => ({ user_id: userId, key })), { onConflict: 'user_id,key' });
  }
  return fresh;
}
