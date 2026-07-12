-- FitLoop schema v15 — reliable cache reads via RPC.
--
-- Reading the cache with a plain GET /rest/v1/ai_estimate_cache proved flaky:
-- Supabase's Data API can edge-cache GET responses, so ~1 in 3 lookups returned
-- an empty result for a row that exists and fell back to a fresh (different)
-- Gemini estimate. A POST to an RPC is never edge-cached and always hits the
-- primary, giving read-after-write consistency. analyze-meal now reads the
-- cache through this function.
--
-- SECURITY DEFINER so it can read the RLS-locked table; execute granted only to
-- service_role (the edge function), so clients still can't reach the cache.
--
-- Additive and safe to re-run.

create or replace function public.ai_cache_get(p_key text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select result from public.ai_estimate_cache where cache_key = p_key;
$$;

revoke execute on function public.ai_cache_get(text) from public;
grant execute on function public.ai_cache_get(text) to service_role;

notify pgrst, 'reload schema';
