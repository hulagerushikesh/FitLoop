-- 0010: schedule the daily-reminders edge function (streak-at-risk push) to run
-- every evening at 19:00 UTC. Same pg_cron + pg_net pattern as 0008; the bearer
-- is the public publishable anon key (satisfies verify_jwt; the function does
-- its work with the injected service-role key). Idempotent.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'daily-reminders') then
    perform cron.unschedule('daily-reminders');
  end if;
end $$;

select cron.schedule(
  'daily-reminders',
  '0 19 * * *', -- every day 19:00 UTC
  $$
  select net.http_post(
    url := 'https://qedtsattownvjcsqvmyc.supabase.co/functions/v1/daily-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_yDxL6JpK1KnwfyvlN_aRNQ_tKJU7230'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
