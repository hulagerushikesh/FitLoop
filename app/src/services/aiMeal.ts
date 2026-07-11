import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { retryWithBackoff } from '../utils/retry';
import { checkRateLimit } from '../engine/rateLimit';

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

// Client-side guardrail on the Gemini-backed endpoint to protect API cost from
// runaway usage. Generous enough that normal logging never trips it.
const AI_CALLS_KEY = 'fitloop.ai.callTimestamps';
const AI_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const AI_MAX_CALLS = 12;

export class RateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    const mins = Math.max(1, Math.ceil(retryAfterMs / 60000));
    super(`You're logging with AI a lot right now — try again in about ${mins} minute${mins === 1 ? '' : 's'}.`);
    this.name = 'RateLimitError';
  }
}

// Exported so other AI-backed services (e.g. voice logging) share the SAME
// client-side budget — total Gemini usage is capped together, not per-feature.
export async function enforceRateLimit(): Promise<void> {
  const raw = await AsyncStorage.getItem(AI_CALLS_KEY);
  const timestamps: number[] = raw ? JSON.parse(raw) : [];
  const result = checkRateLimit(timestamps, Date.now(), AI_WINDOW_MS, AI_MAX_CALLS);
  if (!result.allowed) throw new RateLimitError(result.retryAfterMs);
  await AsyncStorage.setItem(AI_CALLS_KEY, JSON.stringify(result.nextTimestamps));
}

/**
 * Invokes analyze-meal with a client rate-limit gate and one automatic retry
 * (exponential backoff) so a transient network hiccup doesn't force the user
 * to retake a photo or retype. Our own rate-limit error is never retried.
 */
async function invokeAnalyzeMeal(body: Record<string, unknown>, noEstimateMessage: string): Promise<MealEstimate> {
  await enforceRateLimit();
  return retryWithBackoff(
    async () => {
      const { data, error } = await supabase.functions.invoke<AnalyzeMealResponse>('analyze-meal', { body });
      if (error) throw error;
      if (!data?.estimate) throw new Error(data?.error ?? noEstimateMessage);
      return data.estimate;
    },
    { retries: 1, baseDelayMs: 600, shouldRetry: (e) => !(e instanceof RateLimitError) }
  );
}

export async function analyzeMealText(description: string): Promise<MealEstimate> {
  return invokeAnalyzeMeal({ mode: 'text', description }, 'Could not analyze that description.');
}

export async function analyzeMealPhoto(base64Image: string, mimeType: string): Promise<MealEstimate> {
  return invokeAnalyzeMeal(
    { mode: 'photo', imageBase64: base64Image, mimeType },
    'Could not analyze that photo.'
  );
}
