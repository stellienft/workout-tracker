-- ============================================================================
-- Pre-workout warm-up: record an optional cardio warm-up (bike, treadmill,
-- rower, light cardio, …) against the session. Cancelling a workout needs no
-- schema — the session is simply deleted (set_logs cascade).
-- ============================================================================

alter table public.workout_sessions
  add column if not exists warmup_type text,
  add column if not exists warmup_seconds int;
