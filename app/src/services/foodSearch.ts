import { supabase } from './supabase';
import type { FoodItem } from '../types/database';

// Open Food Facts — free, no API key. We cache every result into the
// food_items table (source='off', keyed by source+external_id) so repeat
// searches hit our own database first and the external API is only used
// for genuinely new queries. Requests carry a descriptive UA per OFF's
// usage guidelines and time out rather than hanging the log-food flow.

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_TIMEOUT_MS = 8000;
const USER_AGENT = 'FitLoop/1.0 (personal fitness app)';

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
}

function offToFoodItem(p: OffProduct): Omit<FoodItem, 'id' | 'created_at'> | null {
  const kcal = p.nutriments?.['energy-kcal_100g'];
  if (!p.product_name || !p.code || kcal == null) return null;
  return {
    external_id: p.code,
    source: 'off',
    user_id: null,
    name: p.product_name.slice(0, 120),
    brand: p.brands?.split(',')[0]?.trim() ?? null,
    serving_size: 100,
    serving_unit: 'g',
    calories: Math.round(kcal),
    protein_g: Math.round((p.nutriments?.proteins_100g ?? 0) * 10) / 10,
    carbs_g: Math.round((p.nutriments?.carbohydrates_100g ?? 0) * 10) / 10,
    fat_g: Math.round((p.nutriments?.fat_100g ?? 0) * 10) / 10,
  };
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function cacheItems(items: Omit<FoodItem, 'id' | 'created_at'>[]): Promise<void> {
  if (items.length === 0) return;
  // Best-effort cache write — search results still show if this fails.
  await supabase
    .from('food_items')
    .upsert(items, { onConflict: 'source,external_id', ignoreDuplicates: false })
    .then(() => {});
}

/** Local cache lookup — instant, offline-friendly, no rate limits. */
export async function searchCachedFoods(query: string, limit = 15): Promise<FoodItem[]> {
  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FoodItem[];
}

/**
 * Cache-first food search: local matches immediately, then Open Food Facts
 * for broader results (cached for next time). Returns merged, deduped list.
 */
export async function searchFoods(query: string): Promise<FoodItem[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cached = await searchCachedFoods(trimmed);
  if (cached.length >= 10) return cached;

  try {
    const url = `${OFF_SEARCH_URL}?search_terms=${encodeURIComponent(trimmed)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,brands,nutriments`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return cached;
    const json = (await res.json()) as { products?: OffProduct[] };
    const external = (json.products ?? [])
      .map(offToFoodItem)
      .filter((i): i is NonNullable<typeof i> => i != null);

    await cacheItems(external).catch(() => {});

    const seen = new Set(cached.map((c) => c.external_id).filter(Boolean));
    const merged = [
      ...cached,
      ...external.filter((e) => !seen.has(e.external_id)).map((e) => ({
        ...e,
        id: `off-${e.external_id}`, // synthetic id for list keys; re-fetched from cache when logged
        created_at: '',
      })),
    ];
    return merged as FoodItem[];
  } catch {
    // Network/timeout — cache results are still useful.
    return cached;
  }
}

/** Barcode lookup: cache first, then Open Food Facts product API. */
export async function lookupBarcode(code: string): Promise<FoodItem | null> {
  const { data: cached } = await supabase
    .from('food_items')
    .select('*')
    .eq('source', 'off')
    .eq('external_id', code)
    .maybeSingle();
  if (cached) return cached as FoodItem;

  try {
    const res = await fetchWithTimeout(`${OFF_PRODUCT_URL}/${encodeURIComponent(code)}.json`);
    if (!res.ok) return null;
    const json = (await res.json()) as { status?: number; product?: OffProduct };
    if (json.status !== 1 || !json.product) return null;
    const item = offToFoodItem({ ...json.product, code });
    if (!item) return null;
    await cacheItems([item]).catch(() => {});
    return { ...item, id: `off-${code}`, created_at: '' } as FoodItem;
  } catch {
    return null;
  }
}
