// Supabase Edge Function: parse-voice-log
//
// A single "speak your log" endpoint. Accepts a short base64 audio clip and,
// with one Gemini 2.5 Flash call, transcribes it, classifies the intent
// (food / workout / activity / unclear) and extracts structured data. This
// lets the app avoid maintaining a separate on-device speech-to-text pipeline
// per platform — it reuses the exact same server-side Gemini pattern as
// analyze-meal, and the API key stays server-side (never in the app bundle).
//
// Invoked via `supabase.functions.invoke('parse-voice-log', ...)` from
// app/src/services/voiceLog.ts.
//
// Model note: see analyze-meal for the gemini-2.5-flash quota rationale.

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation limits — reject malformed/oversized requests before they
// reach Gemini (protects the API bill and against abuse). The client caps
// recordings at ~60s; a 60s m4a clip is well under ~2 MB, so ~8 MB of base64
// is a generous ceiling.
const MAX_AUDIO_BASE64_LEN = 9_000_000; // ~6.7 MB decoded
const MAX_LIBRARY_ENTRIES = 300;
const ALLOWED_MIME_TYPES = [
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/x-caf',
  'audio/3gpp',
];

// The audio may contain MULTIPLE things ("I had eggs and a banana, and I did
// bench press and squats"). We return an ARRAY of items so the client can log
// every one at once. Each item is flattened (no deep nesting beyond the sets
// array) — the most reliable shape for Gemini structured output. The client's
// voiceLogParsing engine reshapes this into a typed list.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING', description: 'Verbatim transcription of the whole audio.' },
    unclear_message: {
      type: 'STRING',
      description: 'Only when items is empty: a short note on why nothing could be extracted.',
    },
    items: {
      type: 'ARRAY',
      description: 'One entry per distinct thing the user logged.',
      items: {
        type: 'OBJECT',
        properties: {
          kind: { type: 'STRING', enum: ['food', 'workout', 'activity'] },
          // food
          food_name: { type: 'STRING' },
          food_calories: { type: 'NUMBER' },
          food_protein_g: { type: 'NUMBER' },
          food_carbs_g: { type: 'NUMBER' },
          food_fat_g: { type: 'NUMBER' },
          // workout
          workout_exercise_name: { type: 'STRING' },
          workout_matched_exercise_id: {
            type: 'STRING',
            description: 'Id of the best-matching library exercise, or empty string if none matches.',
          },
          workout_notes: { type: 'STRING' },
          workout_sets: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                weight: { type: 'NUMBER' },
                reps: { type: 'NUMBER' },
                unit: { type: 'STRING', enum: ['kg', 'lb'] },
              },
              required: ['reps'],
            },
          },
          // activity
          activity_name: { type: 'STRING' },
          activity_duration_minutes: { type: 'NUMBER' },
          activity_estimated_calories: { type: 'NUMBER' },
        },
        required: ['kind'],
      },
    },
  },
  required: ['transcript', 'items'],
};

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function buildSystemInstruction(scope: string, library: { id: string; name: string }[]): string {
  const scopeHint =
    scope === 'food'
      ? 'The user is on the food-logging screen, so bias toward classifying this as "food". '
      : scope === 'workout'
        ? 'The user is on the workout-logging screen, so bias toward classifying this as "workout". '
        : '';

  const libraryBlock =
    library.length > 0
      ? 'The user\'s exercise library (id — name):\n' +
        library.map((e) => `${e.id} — ${e.name}`).join('\n') +
        '\nWhen the audio describes a strength exercise, set workout_matched_exercise_id to the id of the closest match from this list, or "" if none is a good match.\n'
      : 'The user has no saved exercises; set workout_matched_exercise_id to "".\n';

  return (
    'You are a logging assistant for a fitness app. You are given an audio clip in which the user describes ' +
    'one OR MORE things: foods they ate, strength exercises they did, and/or cardio activities. ' +
    'First transcribe the whole audio into `transcript`. Then break it into a list of `items`, with ONE ' +
    'entry per distinct thing:\n' +
    '- kind "food": a single food or dish. Give EACH distinct food its own item (e.g. "eggs, toast and a ' +
    'banana" → three food items). Fill food_name and a realistic best-effort food_calories/protein/carbs/fat ' +
    '(assume a typical single serving unless stated).\n' +
    '- kind "workout": a single strength exercise with sets/reps/weight (e.g. "bench press 3 sets of 8 at ' +
    '60 kilos"). Give EACH exercise its own item. Fill workout_exercise_name, workout_sets (one entry per ' +
    'set — expand "3 sets of 8" into 3 entries), and workout_matched_exercise_id. Use the spoken unit ' +
    '(kg/lb); default to kg if unspecified.\n' +
    '- kind "activity": a single cardio/freeform activity not tied to weights (e.g. "I ran for 25 minutes"). ' +
    'Fill activity_name, activity_duration_minutes and a best-effort activity_estimated_calories.\n' +
    'If you genuinely cannot extract anything, return an empty items array and fill unclear_message. ' +
    'Always fill `transcript`.\n' +
    scopeHint +
    'Even under a scope bias, classify each item by its real content — never force a wrong kind. If the whole ' +
    'clip clearly does not match the scope, return an empty items array with an explanation.\n' +
    libraryBlock
  );
}

async function callGemini(
  audioBase64: string,
  mimeType: string,
  systemInstruction: string
): Promise<Record<string, unknown>> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [
          {
            parts: [
              { text: 'Transcribe, classify and extract structured data from this audio.' },
              { inlineData: { mimeType, data: audioBase64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
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

  return JSON.parse(text) as Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest('Request body must be valid JSON.');
  }

  const { audioBase64, mimeType, scope, exerciseLibrary } = body;

  if (typeof audioBase64 !== 'string' || audioBase64.length === 0) {
    return badRequest('audioBase64 is required and must be a non-empty string.');
  }
  if (audioBase64.length > MAX_AUDIO_BASE64_LEN) {
    return badRequest('Audio clip is too large — keep it under ~20 seconds.');
  }
  const resolvedMime = typeof mimeType === 'string' && mimeType ? mimeType : 'audio/mp4';
  if (!ALLOWED_MIME_TYPES.includes(resolvedMime)) {
    return badRequest(`Unsupported audio type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}.`);
  }
  const resolvedScope = scope === 'food' || scope === 'workout' ? scope : 'auto';

  // Sanitize the exercise library context: cap size and keep only {id, name}.
  const library: { id: string; name: string }[] = Array.isArray(exerciseLibrary)
    ? (exerciseLibrary as unknown[])
        .filter(
          (e): e is { id: string; name: string } =>
            !!e && typeof e === 'object' && typeof (e as any).id === 'string' && typeof (e as any).name === 'string'
        )
        .slice(0, MAX_LIBRARY_ENTRIES)
        .map((e) => ({ id: e.id, name: e.name }))
    : [];

  try {
    const result = await callGemini(audioBase64, resolvedMime, buildSystemInstruction(resolvedScope, library));
    return new Response(JSON.stringify({ result }), {
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
