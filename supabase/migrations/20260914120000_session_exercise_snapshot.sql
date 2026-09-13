-- Freeze a workout's exercises at the moment it starts, so later edits to the
-- shared program template can never change an in-progress / paused session.
-- Older sessions (snapshot null) keep reading the live template as before.
alter table public.workout_sessions
  add column if not exists exercise_snapshot jsonb;
