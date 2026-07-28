-- Preferences for the daily motivational quote: show it on the dashboard, and
-- optionally receive it as a morning push (opt-in).
alter table public.profiles
  add column if not exists daily_quote_enabled boolean not null default true,
  add column if not exists motivation_push_enabled boolean not null default false;
