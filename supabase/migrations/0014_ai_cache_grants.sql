-- FitLoop schema v14 — expose ai_estimate_cache to the edge function.
--
-- This project uses the new-cloud default where tables created in `public` are
-- NOT auto-exposed to the Data API roles without explicit GRANTs (see the note
-- at the top of config.toml). So the analyze-meal function (service_role) could
-- not reliably read/write ai_estimate_cache via PostgREST, and the deterministic
-- cache silently fell back to fresh Gemini calls. Grant the service role access
-- and reload PostgREST's schema cache so it takes effect immediately.
--
-- Only service_role is granted — anon/authenticated still have no access
-- (and RLS on the table has no policies), so clients can't touch the cache.
--
-- Additive and safe to re-run.

grant select, insert on public.ai_estimate_cache to service_role;

notify pgrst, 'reload schema';
