-- Adds the "Minimum Effective Dose" program: a low-volume, high-intensity
-- full-body rotation (brief, hard, infrequent training taken to failure with
-- relentless progressive overload). Original program built on well-known
-- high-intensity / minimum-effective-dose training principles.
--
-- Re-runnable: removes any prior copy by slug first (cascades to its workouts
-- and their exercises), then rebuilds.

DO $$
DECLARE
  pid uuid;
  wa uuid;
  wb uuid;
  wc uuid;
  -- "Plank" is an archived seed row (the same one other programs use); match it
  -- by exact name regardless of status, preferring a published copy if one exists.
  plank_id uuid        := (SELECT id FROM public.exercises WHERE name = 'Plank' ORDER BY (status = 'published') DESC LIMIT 1);
  hanging_raise_id uuid := (SELECT id FROM public.exercises WHERE name = 'Hanging Leg Raise' AND status = 'published' ORDER BY length(name) LIMIT 1);
BEGIN
  DELETE FROM public.programs WHERE slug = 'minimum-effective-dose';

  INSERT INTO public.programs (
    name, slug, short_description, description,
    experience_level, scheduling_mode, duration_weeks,
    minimum_days_per_week, maximum_days_per_week, estimated_session_minutes,
    equipment_requirements, difficulty, status, featured, safety_notes, published_at
  ) VALUES (
    'Minimum Effective Dose',
    'minimum-effective-dose',
    'Brief, brutally hard, low-volume training — a couple of working sets to failure, three days a week.',
    'Train briefly, train hard, train infrequently. This is a low-volume, high-intensity plan built on the "minimum effective dose" idea: the least amount of work that still forces your body to change — and then no more.

Three full-body sessions rotate through the week. Each movement gets just one or two genuinely hard working sets, with the last set taken to (or within a rep of) failure. Because the volume is low, recovery is fast and the driver of progress is simple and relentless: add a little weight or a rep every time you can. Control the negative, own every rep, and stop the set only when it is truly done.

It is self-paced, so a missed day never resets your progress — pick up the next workout in the rotation whenever you train.

(An original program built on well-known high-intensity, low-volume training principles. It is not affiliated with or endorsed by any individual coach.)',
    'intermediate', 'sequential', 8,
    3, 4, 40,
    ARRAY['barbell','dumbbell','bench','rack','cable','machine','pull_up_bar'],
    'intermediate', 'published', true,
    'Training close to failure is demanding. Warm up thoroughly and ramp up to your working weight with lighter sets before each hard set. Keep your technique clean — when form breaks down, the set is over. Use a spotter or safety pins on heavy pressing and squatting. New to lifting? Build a base first and leave a rep or two in reserve rather than going to absolute failure.',
    now()
  ) RETURNING id INTO pid;

  -- ---- Full Body A ----
  INSERT INTO public.workout_templates (
    program_id, name, slug, category, description, sequence_order,
    estimated_minutes, difficulty, target_muscle_groups, workout_type
  ) VALUES (
    pid, 'Full Body A', 'med-a', 'strength',
    'Squat and press lead. A couple of all-out sets per movement — the last one to failure.',
    1, 40, 'intermediate', ARRAY['Quads','Chest','Back'], 'strength'
  ) RETURNING id INTO wa;

  INSERT INTO public.workout_template_exercises
    (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rep_target, rest_seconds, notes, is_optional)
  VALUES
    (wa, public._pick_ex('Barbell Full Squat','Quads'), 1, 2, 6, 8, NULL, 180, 'Two hard sets, the last taken to true failure. Add weight only once you hit the top of the rep range on both sets.', false),
    (wa, public._pick_ex('Barbell Bench Press','Chest'), 2, 2, 6, 8, NULL, 180, 'Tight set-up, controlled bar path. Second set is the money set — leave nothing.', false),
    (wa, public._pick_ex('Lat Pulldown','Back'), 3, 2, 8, 12, NULL, 120, 'Drive the elbows down, full stretch at the top. Squeeze, don''t swing.', false),
    (wa, public._pick_ex('Dumbbell Seated Shoulder Press','Shoulders'), 4, 2, 8, 10, NULL, 120, 'Press with intent; lower under control.', false),
    (wa, public._pick_ex('Lying Leg Curl','Hamstrings'), 5, 1, 10, 15, NULL, 90, 'One all-out set. Slow the negative and squeeze hard at the top.', false),
    (wa, plank_id, 6, 2, NULL, NULL, '45s', 60, 'Brace the whole trunk — hold a hard, straight line.', false);

  -- ---- Full Body B ----
  INSERT INTO public.workout_templates (
    program_id, name, slug, category, description, sequence_order,
    estimated_minutes, difficulty, target_muscle_groups, workout_type
  ) VALUES (
    pid, 'Full Body B', 'med-b', 'strength',
    'Hinge and pull lead. Heavy, brief, and hard — reset each rep and push the last set.',
    2, 40, 'intermediate', ARRAY['Back','Hamstrings','Chest'], 'strength'
  ) RETURNING id INTO wb;

  INSERT INTO public.workout_template_exercises
    (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rep_target, rest_seconds, notes, is_optional)
  VALUES
    (wb, public._pick_ex('Barbell Deadlift','Back'), 1, 2, 5, 6, NULL, 210, 'Set the back, brace, and pull with intent. Reset every rep; the second set is your money set.', false),
    (wb, public._pick_ex('Incline Dumbbell Press','Chest'), 2, 2, 8, 10, NULL, 150, 'Full stretch at the bottom, press to lockout. Last set to failure.', false),
    (wb, public._pick_ex('Seated Cable Row','Back'), 3, 2, 8, 12, NULL, 120, 'Chest tall, pull to the stomach, control the stretch.', false),
    (wb, public._pick_ex('Hack Squat','Quads'), 4, 2, 10, 12, NULL, 150, 'Deep and controlled. Grind the last few reps of the final set.', false),
    (wb, public._pick_ex('Dumbbell Lateral Raise','Shoulders'), 5, 2, 12, 15, NULL, 60, 'Lead with the elbows, no swinging. Chase the burn on the last set.', false),
    (wb, hanging_raise_id, 6, 2, 10, 15, NULL, 60, 'Slow and controlled — no kipping. Curl the pelvis up.', false);

  -- ---- Full Body C ----
  INSERT INTO public.workout_templates (
    program_id, name, slug, category, description, sequence_order,
    estimated_minutes, difficulty, target_muscle_groups, workout_type
  ) VALUES (
    pid, 'Full Body C', 'med-c', 'strength',
    'Legs, overhead pressing and arms. Round out the rotation — same rule: last set to failure.',
    3, 40, 'intermediate', ARRAY['Quads','Shoulders','Arms'], 'strength'
  ) RETURNING id INTO wc;

  INSERT INTO public.workout_template_exercises
    (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rep_target, rest_seconds, notes, is_optional)
  VALUES
    (wc, public._pick_ex('Leg Press','Quads'), 1, 2, 10, 12, NULL, 150, 'Full range, controlled. Drive hard and push the final set close to failure.', false),
    (wc, public._pick_ex('Chest Press','Chest'), 2, 2, 8, 12, NULL, 120, 'Steady tempo, full squeeze. Last set all-out.', false),
    (wc, public._pick_ex('Chin-Ups (Narrow Parallel Grip)','Back'), 3, 2, 6, 10, NULL, 150, 'Add weight if these are easy; otherwise slow the negative and go to failure.', false),
    (wc, public._pick_ex('Barbell Seated Overhead Press','Shoulders'), 4, 2, 6, 10, NULL, 150, 'Brace the trunk, press overhead, lower under control.', false),
    (wc, public._pick_ex('Barbell Curl','Biceps'), 5, 2, 8, 12, NULL, 75, 'No swinging — strict reps, hard squeeze. Last set to failure.', false),
    (wc, public._pick_ex('Triceps Pushdown','Triceps'), 6, 2, 8, 12, NULL, 75, 'Elbows pinned, full lockout. Burn out the final set.', false);
END $$;
