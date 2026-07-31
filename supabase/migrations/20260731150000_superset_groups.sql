-- ============================================================================
-- Superset / circuit support.
--
-- workout_template_exercises already has `superset_group int`. Custom split day
-- exercises (the runner path trainer programs materialise into) did not, so a
-- superset defined on a trainer/custom program had nowhere to live. Add it.
--
-- Semantics: exercises in the same workout that share a non-null superset_group
-- value AND sit next to each other (by position) are performed back-to-back as
-- one superset (2 exercises) or circuit (3+). Rest is taken after the round,
-- not between the movements.
-- ============================================================================

alter table public.custom_split_day_exercises
  add column if not exists superset_group int;
