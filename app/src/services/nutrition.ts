import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { DailySummary, FoodLog, FoodLogSource, Meal, MealItem, MealType } from '../types/database';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Read-through cache so a brief network drop doesn't blank out the day's food
// logs the user already saw. Only the current day is worth caching.
const dailyLogsCacheKey = (userId: string, date: string) => `fitloop.cache.foodLogs.${userId}.${date}`;

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
  try {
    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('logged_date', date)
      .order('logged_at', { ascending: true });
    if (error) throw error;
    const logs = (data ?? []) as FoodLog[];
    // Refresh the cache for the current day only.
    if (date === today()) {
      AsyncStorage.setItem(dailyLogsCacheKey(userId, date), JSON.stringify(logs)).catch(() => {});
    }
    return logs;
  } catch (e) {
    // Offline / transient failure: fall back to the last-seen cache for today
    // so the screen shows stale-but-useful data instead of an error/blank.
    if (date === today()) {
      const cached = await AsyncStorage.getItem(dailyLogsCacheKey(userId, date)).catch(() => null);
      if (cached) return JSON.parse(cached) as FoodLog[];
    }
    throw e;
  }
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
  food_item_id?: string | null;
  photo_path?: string | null;
}

/** Postgres/PostgREST error for writing to a column the table doesn't have. */
function isUndefinedColumn(error: { code?: string; message?: string } | null, column: string): boolean {
  if (!error) return false;
  return (
    error.code === '42703' || // undefined_column (Postgres)
    error.code === 'PGRST204' || // column missing from PostgREST schema cache
    (typeof error.message === 'string' && error.message.includes(column))
  );
}

export async function addFoodLog(userId: string, input: NewFoodLogInput): Promise<FoodLog> {
  const row = { user_id: userId, ...input };
  let { data, error } = await supabase.from('food_logs').insert(row).select('*').single();

  // `photo_path` ships in migration 0006. If the live DB predates it, retry
  // without that field so logging still works — the photo just isn't attached
  // until the migration is applied.
  if (error && isUndefinedColumn(error, 'photo_path')) {
    const { photo_path: _omit, ...withoutPhoto } = row;
    ({ data, error } = await supabase.from('food_logs').insert(withoutPhoto).select('*').single());
  }

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

// ============================================================================
// Composite meals (meal builder): a saved meal made of multiple items whose
// macros sum automatically. meals.* keeps the totals; meal_items the parts.
// ============================================================================

export interface NewMealItemInput {
  food_item_id?: string | null;
  name: string;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export async function createCompositeMeal(
  userId: string,
  name: string,
  items: NewMealItemInput[]
): Promise<Meal> {
  const totals = items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories * i.servings,
      protein_g: acc.protein_g + i.protein_g * i.servings,
      carbs_g: acc.carbs_g + i.carbs_g * i.servings,
      fat_g: acc.fat_g + i.fat_g * i.servings,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const meal = await saveMeal(userId, {
    name,
    calories: Math.round(totals.calories),
    protein_g: Math.round(totals.protein_g * 10) / 10,
    carbs_g: Math.round(totals.carbs_g * 10) / 10,
    fat_g: Math.round(totals.fat_g * 10) / 10,
  });

  if (items.length > 0) {
    const { error } = await supabase
      .from('meal_items')
      .insert(items.map((i) => ({ ...i, meal_id: meal.id })));
    if (error) throw error;
  }
  return meal;
}

export async function fetchMealItems(mealId: string): Promise<MealItem[]> {
  const { data, error } = await supabase
    .from('meal_items')
    .select('*')
    .eq('meal_id', mealId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MealItem[];
}

/** AI-photo-logged entries that kept their photo, newest first (gallery). */
export async function fetchPhotoLogs(userId: string, limit = 60): Promise<FoodLog[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .not('photo_path', 'is', null)
    .order('logged_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FoodLog[];
}

/** Frequent + saved foods that fit within the remaining calorie budget. */
export async function suggestFoodsWithinBudget(
  userId: string,
  remainingCalories: number,
  limit = 3
): Promise<Meal[]> {
  if (remainingCalories <= 0) return [];
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .lte('calories', remainingCalories)
    .order('calories', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Meal[];
}
