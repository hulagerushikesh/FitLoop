-- FitLoop schema v13 — deterministic AI estimates.
--
-- Gemini is non-deterministic even at temperature 0 (expert routing + batching
-- mean the same meal/photo can return slightly different calories each call).
-- This cache freezes the FIRST estimate for a given input (keyed by a hash of
-- the description or image bytes) and returns it for every identical input
-- afterwards — so the same food always shows the same numbers, and repeat
-- lookups cost no Gemini quota.
--
-- The cache is GLOBAL (a food estimate isn't user-specific) and NON-SENSITIVE
-- (a hash → macros). RLS is enabled with NO policies, so only the edge function
-- (service role, which bypasses RLS) can read/write it — clients have no access.
--
-- Additive and safe to re-run.

create table if not exists public.ai_estimate_cache (
  cache_key text primary key,
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.ai_estimate_cache enable row level security;
-- Intentionally no policies: service-role only.
