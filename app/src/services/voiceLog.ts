import { supabase } from './supabase';
import { retryWithBackoff } from '../utils/retry';
import { enforceRateLimit, RateLimitError } from './aiMeal';
import { normalizeVoiceBatch, type VoiceBatch } from '../engine/voiceLogParsing';

export type VoiceScope = 'food' | 'workout' | 'auto';

interface ParseVoiceResponse {
  result?: Record<string, unknown>;
  error?: string;
}

export type { VoiceBatch } from '../engine/voiceLogParsing';

// Hard ceiling on how long we wait for the edge function before giving up, so a
// stuck request can't leave the mic spinner up forever. Gemini audio calls are
// usually a few seconds; 30s is a generous graceful-failure cutoff.
const REQUEST_TIMEOUT_MS = 30_000;

class TimeoutError extends Error {
  constructor() {
    super('That took too long — check your connection and try again.');
    this.name = 'TimeoutError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/**
 * Sends a recorded clip to parse-voice-log and returns a normalized result.
 * Reuses the shared AI rate-limit gate and one retry-with-backoff (the same
 * guardrails as analyze-meal); the rate-limit error is never retried, and the
 * whole call is bounded by a timeout so the UI always resolves.
 */
export async function parseVoiceLog(
  audioBase64: string,
  mimeType: string,
  scope: VoiceScope,
  exerciseLibrary: { id: string; name: string }[]
): Promise<VoiceBatch> {
  await enforceRateLimit();

  const raw = await withTimeout(
    retryWithBackoff(
      async () => {
        const { data, error } = await supabase.functions.invoke<ParseVoiceResponse>('parse-voice-log', {
          body: { audioBase64, mimeType, scope, exerciseLibrary },
        });
        if (error) throw error;
        if (!data?.result) throw new Error(data?.error ?? 'Could not understand that recording.');
        return data.result;
      },
      { retries: 1, baseDelayMs: 700, shouldRetry: (e) => !(e instanceof RateLimitError) }
    ),
    REQUEST_TIMEOUT_MS
  );

  return normalizeVoiceBatch(raw);
}
