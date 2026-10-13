-- Pre-workout stretches: record which body-part stretches the member ticked
-- off before lifting, alongside the existing cardio warm-up fields. Stored as a
-- small JSON array of { slug, name, muscle } objects.
alter table public.workout_sessions
  add column if not exists warmup_stretches jsonb not null default '[]'::jsonb;
