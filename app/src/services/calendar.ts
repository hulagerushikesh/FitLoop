import { supabase } from './supabase';
import type { DailySummary, WorkoutSession } from '../types/database';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** year is full (e.g. 2026), month is 1-12. */
export async function fetchMonthSummary(
  userId: string,
  year: number,
  month: number
): Promise<DailySummary[]> {
  const start = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${pad(month)}-${pad(lastDay)}`;

  const { data, error } = await supabase
    .from('daily_summary')
    .select('*')
    .eq('user_id', userId)
    .gte('day', start)
    .lte('day', end);
  if (error) throw error;
  return (data ?? []) as DailySummary[];
}

/** Daily summaries between two YYYY-MM-DD dates (inclusive) — feeds the heatmap. */
export async function fetchSummaryRange(
  userId: string,
  start: string,
  end: string
): Promise<DailySummary[]> {
  const { data, error } = await supabase
    .from('daily_summary')
    .select('*')
    .eq('user_id', userId)
    .gte('day', start)
    .lte('day', end);
  if (error) throw error;
  return (data ?? []) as DailySummary[];
}

export async function fetchSessionsForDate(userId: string, date: string): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('session_date', date)
    .order('started_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkoutSession[];
}
