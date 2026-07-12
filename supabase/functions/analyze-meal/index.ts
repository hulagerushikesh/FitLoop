// Supabase Edge Function: analyze-meal
//
// Estimates calories/macros from a text description or a photo of a meal,
// using Gemini Flash. Called via `supabase.functions.invoke('analyze-meal', ...)`
// from app/src/services/aiMeal.ts — the Gemini API key stays server-side
// (set via `supabase secrets set GEMINI_API_KEY=...`), never in the app bundle.
//
// Model note: gemini-2.0-flash returned a hard "limit: 0" free-tier quota
// error as of 2026-07 (Google's free-tier lineup has evidently moved on).
// Using gemini-2.5-flash as a best-effort update — check
// https://ai.google.dev/models if this also fails to quota, and swap in
// whatever model your API key currently shows free quota for.

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation limits — reject malformed/oversized requests before they
// reach Gemini (protects both the API bill and against abuse).
const MAX_DESCRIPTION_LEN = 500;
const MAX_IMAGE_BASE64_LEN = 7_000_000; // ~5 MB decoded
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

interface MealEstimate {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes?: string;
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: 'Short description of the meal, e.g. "2 fried eggs with toast"' },
    calories: { type: 'NUMBER' },
    protein_g: { type: 'NUMBER' },
    carbs_g: { type: 'NUMBER' },
    fat_g: { type: 'NUMBER' },
    notes: { type: 'STRING', description: 'Brief note on assumptions made, e.g. portion size guessed' },
  },
  required: ['name', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
};

const SYSTEM_INSTRUCTION =
  'You are a nutrition estimation assistant for a fitness app. Always respond with a realistic ' +
  'best-effort estimate, even if uncertain — never refuse. If multiple foods are described or ' +
  'visible, sum them into one combined estimate for the whole meal. Assume a typical single ' +
  'serving/portion unless stated otherwise, and briefly note that assumption.';

async function callGemini(parts: Array<Record<string, unknown>>): Promise<MealEstimate> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          // Deterministic decoding: the SAME description or photo should always
          // return the SAME calories/macros. temperature 0 = greedy (no random
          // sampling); a fixed seed pins any remaining tie-breaks so repeats are
          // reproducible instead of drifting each call.
          temperature: 0,
          topP: 1,
          seed: 7,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${text}`);
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content.');

  return JSON.parse(text) as MealEstimate;
}

// ---------------------------------------------------------------------------
// Deterministic cache. Gemini isn't reproducible even at temperature 0, so the
// FIRST estimate for a given input is frozen in ai_estimate_cache and returned
// for every identical input afterwards (this also cuts Gemini quota usage for
// repeated foods). We talk DIRECTLY to Postgres via the injected SUPABASE_DB_URL
// rather than PostgREST — the Data API's GET responses can be edge-cached and
// its reads proved flaky from inside the function, whereas a direct connection
// gives reliable read-after-write. The postgres role bypasses RLS. All cache
// calls are best-effort: any failure falls back to a live Gemini call.
// ---------------------------------------------------------------------------
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';

const DB_URL = Deno.env.get('SUPABASE_DB_URL');
let sqlClient: ReturnType<typeof postgres> | null = null;
function db(): ReturnType<typeof postgres> | null {
  if (!DB_URL) return null;
  if (!sqlClient) sqlClient = postgres(DB_URL, { prepare: false, max: 2, idle_timeout: 20 });
  return sqlClient;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function cacheGet(key: string): Promise<MealEstimate | null> {
  const sql = db();
  if (!sql) return null;
  try {
    const rows = await sql`select result from public.ai_estimate_cache where cache_key = ${key} limit 1`;
    return (rows[0]?.result as MealEstimate | undefined) ?? null;
  } catch {
    return null;
  }
}

async function cachePut(key: string, result: MealEstimate): Promise<void> {
  const sql = db();
  if (!sql) return;
  try {
    // Freeze the first estimate: a later miss can never overwrite it.
    await sql`
      insert into public.ai_estimate_cache (cache_key, result)
      values (${key}, ${sql.json(result as unknown as object)})
      on conflict (cache_key) do nothing
    `;
  } catch {
    // ignore — caching is best-effort
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // Malformed JSON is a client error, not a server crash.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest('Request body must be valid JSON.');
  }

  const mode = body.mode;
  if (mode !== 'text' && mode !== 'photo') {
    return badRequest('mode must be "text" or "photo".');
  }

  try {
    let parts: Array<Record<string, unknown>>;
    let cacheKey: string;

    if (mode === 'text') {
      const description = body.description;
      if (typeof description !== 'string' || !description.trim()) {
        return badRequest('description is required and must be a non-empty string.');
      }
      if (description.length > MAX_DESCRIPTION_LEN) {
        return badRequest(`description must be ${MAX_DESCRIPTION_LEN} characters or fewer.`);
      }
      // Normalize (lowercase + collapse whitespace) so "Two Eggs" and
      // "two  eggs" resolve to the same cached estimate.
      const normalized = description.trim().toLowerCase().replace(/\s+/g, ' ');
      cacheKey = `text:${await sha256Hex(normalized)}`;
      parts = [{ text: `Estimate the nutrition for this meal: "${description.trim()}"` }];
    } else {
      const { imageBase64, mimeType } = body;
      if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
        return badRequest('imageBase64 is required and must be a non-empty string.');
      }
      if (imageBase64.length > MAX_IMAGE_BASE64_LEN) {
        return badRequest('Image is too large — please use a smaller photo.');
      }
      const resolvedMime = typeof mimeType === 'string' && mimeType ? mimeType : 'image/jpeg';
      if (!ALLOWED_MIME_TYPES.includes(resolvedMime)) {
        return badRequest(`Unsupported image type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}.`);
      }
      // Same image bytes → same cache key → same estimate.
      cacheKey = `photo:${await sha256Hex(imageBase64)}`;
      parts = [
        { text: 'Identify the food in this photo and estimate its nutrition.' },
        { inlineData: { mimeType: resolvedMime, data: imageBase64 } },
      ];
    }

    // Return the frozen estimate if we've seen this exact input before.
    const cached = await cacheGet(cacheKey);
    const estimate = cached ?? (await callGemini(parts));
    if (!cached) await cachePut(cacheKey, estimate);

    return new Response(JSON.stringify({ estimate }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
