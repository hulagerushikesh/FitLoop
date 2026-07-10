// Supabase Edge Function: daily-reminders
//
// Server-sent "streak at risk" push: finds onboarded users who have a
// registered Expo push token but haven't logged any food today, and sends them
// a nudge via the Expo push API. Meant to run on an evening cron (see the
// 0010 migration). Uses the service-role key to read across users.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
}

async function sendExpoPush(messages: ExpoMessage[]): Promise<number> {
  let sent = 0;
  // Expo accepts up to 100 messages per request.
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
    if (res.ok) sent += batch.length;
  }
  return sent;
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: tokens, error: tokensError }, { data: loggedToday }] = await Promise.all([
    supabase.from('push_tokens').select('user_id, token'),
    supabase.from('food_logs').select('user_id').eq('logged_date', today),
  ]);

  if (tokensError) {
    return new Response(JSON.stringify({ error: tokensError.message }), { status: 500 });
  }

  const loggedUserIds = new Set((loggedToday ?? []).map((r) => r.user_id as string));

  const messages: ExpoMessage[] = (tokens ?? [])
    .filter((t) => !loggedUserIds.has(t.user_id as string))
    .map((t) => ({
      to: t.token as string,
      title: 'Keep your streak alive 🔥',
      body: "You haven't logged anything today — tap to log a meal.",
      sound: 'default',
    }));

  const sent = messages.length > 0 ? await sendExpoPush(messages) : 0;

  return new Response(JSON.stringify({ candidates: messages.length, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
