-- Onboarding: capture the member's age and gym/training history so programming
-- and coaching can be tailored to how long they've been training.

alter table public.profiles
  add column if not exists age integer
    check (age is null or (age >= 13 and age <= 100)),
  add column if not exists training_history text;

comment on column public.profiles.age is 'Member age in years, captured during onboarding.';
comment on column public.profiles.training_history is
  'How long the member has been training: never, lt_6m, 6_12m, 1_3y, 3y_plus, returning.';
