-- Schedule the weekly-recalibration edge function to run automatically every
-- Monday at 06:00 UTC, using pg_cron to fire and pg_net to POST to the function.
--
-- Auth: the Authorization bearer below is the project's PUBLISHABLE anon key
-- (the same one shipped in the client bundle — not a secret). It satisfies the
-- function's verify_jwt; the function does its privileged work with the
-- service-role key the platform injects, and is self-correcting (a repeat run
-- finds no further deviation and no-ops), so a public trigger is low-risk.
--
-- Idempotent: re-running this migration replaces the existing schedule.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'weekly-recalibration') then
    perform cron.unschedule('weekly-recalibration');
  end if;
end $$;

select cron.schedule(
  'weekly-recalibration',
  '0 6 * * 1', -- every Monday 06:00 UTC
  $$
  select net.http_post(
    url := 'https://qedtsattownvjcsqvmyc.supabase.co/functions/v1/weekly-recalibration',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_yDxL6JpK1KnwfyvlN_aRNQ_tKJU7230'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
