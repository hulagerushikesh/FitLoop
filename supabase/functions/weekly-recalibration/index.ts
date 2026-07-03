// Supabase Edge Function: weekly-recalibration
//
// For every onboarded user, compares their actual 7-day-vs-previous-7-day
// weight trend against their declared target rate and inserts a new
// `goals` row (with a transparent `reason`) if the deviation exceeds the
// threshold. Intended to run weekly via a scheduled trigger — see
// supabase/README.md for deployment + scheduling instructions.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { computeRecalibration } from './recalibration.ts';
import { calculateMacros } from './calorieEngine.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (_req: Request) => {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, goal_type, target_rate_kg_per_week')
    .eq('onboarding_completed', true);

  if (profilesError) {
    return new Response(JSON.stringify({ error: profilesError.message }), { status: 500 });
  }

  const results: Array<{ user_id: string; adjusted: boolean; reason: string; error?: string }> = [];

  for (const profile of profiles ?? []) {
    if (!profile.goal_type || profile.target_rate_kg_per_week == null) continue;

    const { data: goal } = await supabase
      .from('goals')
      .select('calorie_target')
      .eq('user_id', profile.id)
      .order('effective_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!goal) continue;

    const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
    const { data: metrics } = await supabase
      .from('body_metrics')
      .select('recorded_at, weight_kg')
      .eq('user_id', profile.id)
      .gte('recorded_at', fourteenDaysAgo)
      .order('recorded_at', { ascending: true });

    const weightHistory = (metrics ?? []).map((m) => ({ date: m.recorded_at, weightKg: m.weight_kg }));
    if (weightHistory.length === 0) continue;

    const recalibration = computeRecalibration({
      weightHistory,
      currentCalorieTarget: goal.calorie_target,
      targetRateKgPerWeek: profile.target_rate_kg_per_week,
      goalType: profile.goal_type,
    });

    if (!recalibration.adjusted) {
      results.push({ user_id: profile.id, adjusted: false, reason: recalibration.reason });
      continue;
    }

    const latestWeight = weightHistory[weightHistory.length - 1].weightKg;
    const macros = calculateMacros(latestWeight, recalibration.newCalorieTarget, profile.goal_type);

    const { error: insertError } = await supabase.from('goals').insert({
      user_id: profile.id,
      calorie_target: macros.calories,
      protein_g: macros.protein_g,
      fat_g: macros.fat_g,
      carbs_g: macros.carbs_g,
      reason: recalibration.reason,
    });

    results.push({
      user_id: profile.id,
      adjusted: true,
      reason: recalibration.reason,
      error: insertError?.message,
    });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
