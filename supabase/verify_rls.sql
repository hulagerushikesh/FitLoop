-- ============================================================================
-- RLS verification — run in the Supabase SQL Editor.
--
-- Phase 9 acceptance: confirm every application table in `public` has Row Level
-- Security ENABLED and at least one policy. Each query below returns ZERO rows
-- when things are healthy; any row it returns is a table that needs attention.
--
-- Safe to run repeatedly; read-only (SELECT against catalog views).
-- ============================================================================

-- 1) Tables in `public` with RLS DISABLED.
--    Any row here = a table anyone with the anon key could read/write. Fix with:
--      alter table public.<name> enable row level security;
select
  c.relname            as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'                 -- ordinary tables only
  and c.relrowsecurity = false
order by c.relname;

-- 2) Tables with RLS ENABLED but NO policies.
--    RLS with zero policies denies all access to non-owners — usually a mistake
--    (the table becomes unusable through the Data API). Add the appropriate
--    per-user policy (auth.uid() = user_id, or the join-based check).
select
  c.relname            as rls_enabled_but_no_policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = true
  and not exists (
    select 1 from pg_policy p where p.polrelid = c.oid
  )
order by c.relname;

-- 3) Full inventory: every public table, whether RLS is on, and its policy
--    count. Use this to eyeball coverage across all 17 app tables.
select
  c.relname                                   as table_name,
  c.relrowsecurity                            as rls_enabled,
  (select count(*) from pg_policy p where p.polrelid = c.oid) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- 4) Every policy and the expression it enforces — spot any policy that is NOT
--    scoped to the current user (should reference auth.uid(), or join through a
--    parent row that is, e.g. workout_exercises -> workouts.user_id).
select
  p.polrelid::regclass::text                  as table_name,
  p.polname                                   as policy_name,
  p.polcmd                                    as command,     -- r=select w=update a=insert d=delete *=all
  pg_get_expr(p.polqual, p.polrelid)          as using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid)     as with_check_expr
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by table_name, policy_name;
