-- Where the member trains — captured during onboarding to tailor program
-- recommendations (home / gym / both).
alter table public.profiles
  add column if not exists training_location text
  check (training_location in ('home', 'gym', 'both'));
