import { supabase } from './supabase';
import type { Goal } from '../types/database';

export interface NewGoalInput {
  calorie_target: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  reason: string;
}

export async function insertGoal(userId: string, input: NewGoalInput): Promise<void> {
  const { error } = await supabase.from('goals').insert({ user_id: userId, ...input });
  if (error) throw error;
}

export async function fetchLatestGoal(userId: string): Promise<Goal | null> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('effective_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Goal | null;
}
