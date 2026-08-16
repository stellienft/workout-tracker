-- Opt-in: auto-share milestones (e.g. finishing a program) to the feed.
alter table public.profiles
  add column if not exists feed_autoshare_enabled boolean not null default false;
