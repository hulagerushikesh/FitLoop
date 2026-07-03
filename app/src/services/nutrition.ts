import { supabase } from './supabase';
import type { DailySummary, FoodLog, FoodLogSource, Meal, MealType } from '../types/database';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Daily calorie/macro totals for the last `days` days (most recent first), for the Nutrition history view. */
export async function fetchRecentSummary(userId: string, days: number = 30): Promise<DailySummary[]> {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const startDate = start.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('daily_summary')
    .select('*')
    .eq('user_id', userId)
    .gte('day', startDate)
    .order('day', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DailySummary[];
}

export async function fetchDailyLogs(userId: string, date: string = today()): Promise<FoodLog[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', date)
    .order('logged_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FoodLog[];
}

export interface NewFoodLogInput {
  name: string;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: MealType;
  source: FoodLogSource;
  meal_id?: string | null;
}

export async function addFoodLog(userId: string, input: NewFoodLogInput): Promise<FoodLog> {
  const { data, error } = await supabase
    .from('food_logs')
    .insert({ user_id: userId, ...input })
    .select('*')
    .single();
  if (error) throw error;
  return data as FoodLog;
}

export async function deleteFoodLog(id: string): Promise<void> {
  const { error } = await supabase.from('food_logs').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchMeals(userId: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Meal[];
}

export interface NewMealInput {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export async function saveMeal(userId: string, input: NewMealInput): Promise<Meal> {
  const { data, error } = await supabase
    .from('meals')
    .insert({ user_id: userId, ...input })
    .select('*')
    .single();
  if (error) throw error;
  return data as Meal;
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from('meals').delete().eq('id', id);
  if (error) throw error;
}

export async function logSavedMeal(userId: string, meal: Meal, mealType: MealType): Promise<FoodLog> {
  return addFoodLog(userId, {
    name: meal.name,
    servings: 1,
    calories: meal.calories,
    protein_g: meal.protein_g,
    carbs_g: meal.carbs_g,
    fat_g: meal.fat_g,
    meal_type: mealType,
    source: 'food_item',
    meal_id: meal.id,
  });
}
