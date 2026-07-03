import { supabase } from './supabase';

export interface MealEstimate {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes?: string;
}

interface AnalyzeMealResponse {
  estimate?: MealEstimate;
  error?: string;
}

export async function analyzeMealText(description: string): Promise<MealEstimate> {
  const { data, error } = await supabase.functions.invoke<AnalyzeMealResponse>('analyze-meal', {
    body: { mode: 'text', description },
  });
  if (error) throw error;
  if (!data?.estimate) throw new Error(data?.error ?? 'Could not analyze that description.');
  return data.estimate;
}

export async function analyzeMealPhoto(base64Image: string, mimeType: string): Promise<MealEstimate> {
  const { data, error } = await supabase.functions.invoke<AnalyzeMealResponse>('analyze-meal', {
    body: { mode: 'photo', imageBase64: base64Image, mimeType },
  });
  if (error) throw error;
  if (!data?.estimate) throw new Error(data?.error ?? 'Could not analyze that photo.');
  return data.estimate;
}
