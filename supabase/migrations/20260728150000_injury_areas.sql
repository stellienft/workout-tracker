-- Structured injuries/sore areas chosen at onboarding, so program tailoring and
-- exercise safety come from what each member reports — not a hardcoded shoulder
-- flag. Free-text `considerations` stays as an optional extra note.
alter table public.profiles
  add column if not exists injury_areas text[] not null default '{}';
