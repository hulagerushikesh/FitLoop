import { supabase } from './supabase';
import type { Profile } from '../types/database';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

export interface OnboardingInput {
  age: number;
  sex: NonNullable<Profile['sex']>;
  height_cm: number;
  activity_level: NonNullable<Profile['activity_level']>;
  goal_type: NonNullable<Profile['goal_type']>;
  target_rate_kg_per_week: number;
  weight_kg: number;
}

export async function completeOnboarding(
  userId: string,
  input: OnboardingInput
): Promise<void> {
  const { weight_kg, ...profileFields } = input;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ ...profileFields, onboarding_completed: true })
    .eq('id', userId);
  if (profileError) throw profileError;

  const { error: metricError } = await supabase
    .from('body_metrics')
    .upsert(
      { user_id: userId, weight_kg, recorded_at: today() },
      { onConflict: 'user_id,recorded_at' }
    );
  if (metricError) throw metricError;
}

export async function updateProfile(
  userId: string,
  fields: Partial<Profile>
): Promise<void> {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  if (error) throw error;
}

export async function fetchLatestWeight(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('body_metrics')
    .select('weight_kg')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.weight_kg ?? null;
}

export async function logWeight(userId: string, weightKg: number): Promise<void> {
  const { error } = await supabase
    .from('body_metrics')
    .upsert(
      { user_id: userId, weight_kg: weightKg, recorded_at: today() },
      { onConflict: 'user_id,recorded_at' }
    );
  if (error) throw error;
}
