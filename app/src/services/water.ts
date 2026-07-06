import { supabase } from './supabase';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchTodayWaterMl(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('water_logs')
    .select('volume_ml')
    .eq('user_id', userId)
    .eq('logged_date', today());
  if (error) throw error;
  return (data ?? []).reduce((sum, r) => sum + (r.volume_ml as number), 0);
}

export async function addWater(userId: string, volumeMl: number): Promise<void> {
  const { error } = await supabase
    .from('water_logs')
    .insert({ user_id: userId, volume_ml: volumeMl });
  if (error) throw error;
}

/** Undo the most recent water entry today (mis-taps happen). */
export async function removeLastWater(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('water_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('logged_date', today())
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;
  const { error: delError } = await supabase.from('water_logs').delete().eq('id', data.id);
  if (delError) throw delError;
}
