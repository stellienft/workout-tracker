-- Opt-in: notify a member when someone they follow comments on the feed.
alter table public.profiles
  add column if not exists feed_notifications_enabled boolean not null default false;
