import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { earnedAchievements, type AchievementStats } from '../engine/achievements';
import type { VolumeLogEntry } from '../engine/analytics';
import type { BodyMetric, MuscleGroup } from '../types/database';

const PROGRESS_BUCKET = 'progress-photos';

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

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

/**
 * Records a progress photo for a day, replacing any existing photo for that
 * same day (one-per-day). Done as delete-then-insert rather than an upsert so
 * it works whether or not migration 0012's unique index has been applied yet —
 * the index, once present, is just a belt-and-suspenders DB guarantee.
 * Defaults to today.
 */
export async function addProgressPhoto(
  userId: string,
  storagePath: string,
  takenAt: string = todayUtc()
): Promise<void> {
  await supabase.from('progress_photos').delete().eq('user_id', userId).eq('taken_at', takenAt);
  const { error } = await supabase
    .from('progress_photos')
    .insert({ user_id: userId, storage_path: storagePath, taken_at: takenAt });
  if (error) throw error;
}

/**
 * Opens the camera, uploads the shot to the private progress-photos bucket, and
 * upserts today's progress_photos row. Returns the storage path, or null if the
 * user cancels. Mirrors the meal-photo capture flow (expo-image-picker + base64
 * upload) for consistency.
 */
export async function captureDailyProgressPhoto(userId: string): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera permission is needed to take a progress photo.');
  }

  const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 });
  if (result.canceled || !result.assets[0]?.base64) return null;

  const asset = result.assets[0];
  const takenAt = todayUtc();
  const path = `${userId}/progress@${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(PROGRESS_BUCKET)
    .upload(path, base64ToBytes(asset.base64!), {
      contentType: asset.mimeType ?? 'image/jpeg',
      upsert: true,
    });
  if (uploadError) throw uploadError;

  await addProgressPhoto(userId, path, takenAt);
  return path;
}

/** Signed URL for a private progress-photo path (the bucket is not public). */
export async function signedProgressPhotoUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage.from(PROGRESS_BUCKET).createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

/** Map of taken_at (YYYY-MM-DD) → storage_path within an inclusive date range. */
export async function fetchProgressPhotoMap(
  userId: string,
  start: string,
  end: string
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('taken_at, storage_path')
    .eq('user_id', userId)
    .gte('taken_at', start)
    .lte('taken_at', end);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const row of (data ?? []) as { taken_at: string; storage_path: string }[]) {
    out[row.taken_at] = row.storage_path;
  }
  return out;
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
