import { supabase } from './supabase';
import { STANDARD_PLAN } from '../constants/workoutTemplates';
import type { Exercise, MuscleGroup, MuscleGroupFatigue, SetType, SplitType, Workout, WorkoutExercise, WorkoutLog, WorkoutSession } from '../types/database';

export async function fetchExerciseLibrary(userId: string): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order('muscle_group', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function fetchExerciseById(exerciseId: string): Promise<Exercise> {
  const { data, error } = await supabase.from('exercises').select('*').eq('id', exerciseId).single();
  if (error) throw error;
  return data as Exercise;
}

export async function addCustomExercise(
  userId: string,
  input: {
    name: string;
    muscle_group: MuscleGroup;
    equipment?: string | null;
    category?: 'compound' | 'isolation' | 'cardio' | null;
    photo_path?: string | null;
  }
): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .insert({ user_id: userId, is_custom: true, sort_order: 100, ...input })
    .select('*')
    .single();
  if (error) throw error;
  return data as Exercise;
}

export async function fetchRoutines(userId: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Workout[];
}

export async function fetchRoutine(workoutId: string): Promise<Workout> {
  const { data, error } = await supabase.from('workouts').select('*').eq('id', workoutId).single();
  if (error) throw error;
  return data as Workout;
}

export interface RoutineExerciseRow extends WorkoutExercise {
  exercise: Exercise;
}

export async function fetchRoutineExercises(workoutId: string): Promise<RoutineExerciseRow[]> {
  const { data, error } = await supabase
    .from('workout_exercises')
    .select('*, exercise:exercises(*)')
    .eq('workout_id', workoutId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as RoutineExerciseRow[];
}

export interface RoutineExerciseInput {
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_reps: number | null;
  superset_group: number | null;
}

export async function createRoutine(
  userId: string,
  input: {
    name: string;
    split_type: SplitType | null;
    day_of_week: number | null;
    exercises: RoutineExerciseInput[];
  }
): Promise<string> {
  const { data: workout, error } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      name: input.name,
      split_type: input.split_type,
      day_of_week: input.day_of_week,
    })
    .select('id')
    .single();
  if (error) throw error;

  if (input.exercises.length > 0) {
    const { error: exercisesError } = await supabase
      .from('workout_exercises')
      .insert(input.exercises.map((e) => ({ ...e, workout_id: workout.id })));
    if (exercisesError) throw exercisesError;
  }

  return workout.id;
}

export async function updateRoutineExercises(
  workoutId: string,
  exercises: RoutineExerciseInput[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('workout_exercises')
    .delete()
    .eq('workout_id', workoutId);
  if (deleteError) throw deleteError;

  if (exercises.length > 0) {
    const { error: insertError } = await supabase
      .from('workout_exercises')
      .insert(exercises.map((e) => ({ ...e, workout_id: workoutId })));
    if (insertError) throw insertError;
  }
}

export async function updateRoutineDetails(
  workoutId: string,
  input: { name: string; split_type: SplitType | null; day_of_week: number | null }
): Promise<void> {
  const { error } = await supabase.from('workouts').update(input).eq('id', workoutId);
  if (error) throw error;
}

export async function deleteRoutine(workoutId: string): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
  if (error) throw error;
}

/**
 * Creates the standard 5-day split (see constants/workoutTemplates.ts
 * STANDARD_PLAN) for a brand-new user, resolving exercise names against
 * the shared library. Silently skips any exercise name that isn't found
 * (e.g. if the seed_exercises.sql migration hasn't been run yet) rather
 * than failing the whole plan.
 */
export async function seedStandardPlan(userId: string): Promise<void> {
  const library = await fetchExerciseLibrary(userId);
  const byName = new Map(library.map((e) => [e.name, e]));

  for (const day of STANDARD_PLAN) {
    const exercises: RoutineExerciseInput[] = day.exerciseNames
      .map((name) => byName.get(name))
      .filter((e): e is Exercise => !!e)
      .map((exercise, index) => ({
        exercise_id: exercise.id,
        order_index: index,
        target_sets: 3,
        target_reps: 10,
        superset_group: null,
      }));

    if (exercises.length === 0) continue;

    await createRoutine(userId, {
      name: day.name,
      split_type: 'custom',
      day_of_week: day.dayOfWeek,
      exercises,
    });
  }
}

export async function startSession(
  userId: string,
  workoutId: string | null,
  name: string
): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ user_id: userId, workout_id: workoutId, name })
    .select('*')
    .single();
  if (error) throw error;
  return data as WorkoutSession;
}

/**
 * The unfinished session (if any) for this workout started today. Reused
 * instead of creating a new session on every screen mount, which would
 * otherwise leave a trail of duplicate empty sessions if the user
 * navigates away and back without finishing (e.g. via the back button).
 */
export async function fetchActiveSession(userId: string, workoutId: string): Promise<WorkoutSession | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('workout_id', workoutId)
    .eq('session_date', today)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as WorkoutSession | null) ?? null;
}

export async function fetchSessionLogs(sessionId: string): Promise<WorkoutLog[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('session_id', sessionId)
    .order('set_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkoutLog[];
}

export async function finishSession(
  sessionId: string,
  caloriesBurned: number
): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ ended_at: new Date().toISOString(), calories_burned: caloriesBurned })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function logSet(
  userId: string,
  sessionId: string,
  workoutId: string | null,
  exerciseId: string,
  setNumber: number,
  input: {
    weight_kg: number | null;
    reps: number | null;
    rpe: number | null;
    set_type?: SetType;
  }
): Promise<WorkoutLog> {
  const { data, error } = await supabase
    .from('workout_logs')
    .insert({
      user_id: userId,
      session_id: sessionId,
      workout_id: workoutId,
      exercise_id: exerciseId,
      set_number: setNumber,
      ...input,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as WorkoutLog;
}

/** Sets from the user's most recent completed session for this exercise (excludes the given session). */
export async function fetchLastSessionSets(
  userId: string,
  exerciseId: string,
  excludeSessionId: string
): Promise<WorkoutLog[]> {
  const { data: lastLog } = await supabase
    .from('workout_logs')
    .select('session_id')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .neq('session_id', excludeSessionId)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastLog?.session_id) return [];

  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('session_id', lastLog.session_id)
    .eq('exercise_id', exerciseId)
    .order('set_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkoutLog[];
}

/**
 * Historical best-set progression for one exercise: the top weight×reps set
 * per session date, oldest first — feeds the per-exercise progress chart
 * and PR detection.
 */
export interface ExerciseHistoryPoint {
  date: string;
  bestWeightKg: number;
  bestReps: number;
}

export async function fetchExerciseHistory(
  userId: string,
  exerciseId: string,
  limitSessions: number = 30
): Promise<ExerciseHistoryPoint[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('weight_kg, reps, logged_at')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .not('weight_kg', 'is', null)
    .not('reps', 'is', null)
    .order('logged_at', { ascending: false })
    .limit(500);
  if (error) throw error;

  const byDate = new Map<string, ExerciseHistoryPoint>();
  for (const row of data ?? []) {
    const date = (row.logged_at as string).slice(0, 10);
    const existing = byDate.get(date);
    const weight = row.weight_kg as number;
    const reps = row.reps as number;
    if (
      !existing ||
      weight > existing.bestWeightKg ||
      (weight === existing.bestWeightKg && reps > existing.bestReps)
    ) {
      byDate.set(date, { date, bestWeightKg: weight, bestReps: reps });
    }
  }
  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limitSessions);
}

/** All historical weighted sets for an exercise (for PR detection), excluding a session. */
export async function fetchHistoricalSets(
  userId: string,
  exerciseId: string,
  excludeSessionId: string
): Promise<{ weightKg: number; reps: number }[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('weight_kg, reps')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .neq('session_id', excludeSessionId)
    .not('weight_kg', 'is', null)
    .not('reps', 'is', null)
    .limit(1000);
  if (error) throw error;
  return (data ?? []).map((r) => ({ weightKg: r.weight_kg as number, reps: r.reps as number }));
}

// ============================================================================
// Muscle recovery model (see engine/muscleRecovery.ts for the heuristics)
// ============================================================================

export async function fetchMuscleFatigue(userId: string): Promise<MuscleGroupFatigue[]> {
  const { data, error } = await supabase
    .from('muscle_group_fatigue')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as MuscleGroupFatigue[];
}

/**
 * Refreshes muscle_group_fatigue after a completed session: stamps
 * last_trained_at for every muscle group hit and recomputes 7-day rolling
 * volume from workout_logs. Failures here must never block finishing a
 * workout — call it fire-and-forget with a catch.
 */
export async function updateMuscleFatigueAfterSession(
  userId: string,
  sessionExercises: { muscleGroup: MuscleGroup; recoveryHours: number }[]
): Promise<void> {
  const groups = [...new Set(sessionExercises.map((e) => e.muscleGroup))];
  if (groups.length === 0) return;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const { data: recentLogs, error: logsError } = await supabase
    .from('workout_logs')
    .select('weight_kg, reps, exercise:exercises(muscle_group)')
    .eq('user_id', userId)
    .gte('logged_at', sevenDaysAgo)
    .limit(2000);
  if (logsError) throw logsError;

  const volumeByGroup = new Map<string, number>();
  for (const row of (recentLogs ?? []) as unknown as {
    weight_kg: number | null;
    reps: number | null;
    exercise: { muscle_group: MuscleGroup } | null;
  }[]) {
    const group = row.exercise?.muscle_group;
    if (!group) continue;
    volumeByGroup.set(group, (volumeByGroup.get(group) ?? 0) + (row.weight_kg ?? 0) * (row.reps ?? 0));
  }

  const now = new Date().toISOString();
  const recoveryByGroup = new Map(sessionExercises.map((e) => [e.muscleGroup, e.recoveryHours]));
  const rows = groups.map((muscle_group) => ({
    user_id: userId,
    muscle_group,
    last_trained_at: now,
    estimated_recovery_hours: recoveryByGroup.get(muscle_group)!,
    rolling_volume_7d: Math.round(volumeByGroup.get(muscle_group) ?? 0),
    updated_at: now,
  }));

  const { error } = await supabase
    .from('muscle_group_fatigue')
    .upsert(rows, { onConflict: 'user_id,muscle_group' });
  if (error) throw error;
}

/** Muscle groups each routine trains — feeds the recovery-aware ranking. */
export async function fetchRoutineMuscleGroups(
  userId: string
): Promise<{ id: string; name: string; muscleGroups: MuscleGroup[] }[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, name, workout_exercises(exercise:exercises(muscle_group))')
    .eq('user_id', userId);
  if (error) throw error;

  return ((data ?? []) as unknown as {
    id: string;
    name: string;
    workout_exercises: { exercise: { muscle_group: MuscleGroup } | null }[];
  }[]).map((w) => ({
    id: w.id,
    name: w.name,
    muscleGroups: [
      ...new Set(
        w.workout_exercises
          .map((we) => we.exercise?.muscle_group)
          .filter((g): g is MuscleGroup => !!g)
      ),
    ],
  }));
}
