-- Optional goal body weight, used to project a target date on the GLP-1
-- weight-loss journey card.
alter table public.profiles
  add column if not exists goal_weight_kg numeric;
