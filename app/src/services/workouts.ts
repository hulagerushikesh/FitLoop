import { supabase } from './supabase';
import { STANDARD_PLAN } from '../constants/workoutTemplates';
import type { Exercise, MuscleGroup, SplitType, Workout, WorkoutExercise, WorkoutLog, WorkoutSession } from '../types/database';

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
  input: { name: string; muscle_group: MuscleGroup; equipment?: string | null }
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
  input: { weight_kg: number | null; reps: number | null; rpe: number | null }
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
