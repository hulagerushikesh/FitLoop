-- 0009: Expo push tokens for true (server-sent) push notifications.
--
-- One row per (user, device token). The client upserts its Expo push token on
-- login; server-side jobs (send-push / daily-reminders edge functions) read
-- these to deliver notifications even when the app is closed.

create table if not exists public.push_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

alter table public.push_tokens enable row level security;

drop policy if exists "Users manage own push tokens" on public.push_tokens;
create policy "Users manage own push tokens" on public.push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
