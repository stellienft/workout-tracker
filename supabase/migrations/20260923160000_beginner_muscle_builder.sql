-- "Beginner Muscle Builder": an original, beginner-friendly 3-day full-body
-- hypertrophy program (self-paced rotation). Straightforward compounds and
-- machines, 3 sets of 8–15 reps, built to teach the movements and add muscle.
-- Re-runnable (rebuilds by slug).

DO $$
DECLARE
  pid uuid;
  w1 uuid; w2 uuid; w3 uuid;
  plank_id uuid := (SELECT id FROM public.exercises WHERE name = 'Plank' ORDER BY (status='published') DESC LIMIT 1);
BEGIN
  DELETE FROM public.programs WHERE slug = 'beginner-muscle-builder';
  INSERT INTO public.programs (
    name, slug, short_description, description, experience_level, scheduling_mode,
    duration_weeks, minimum_days_per_week, maximum_days_per_week, estimated_session_minutes,
    equipment_requirements, difficulty, status, featured, safety_notes, published_at
  ) VALUES (
    'Beginner Muscle Builder',
    'beginner-muscle-builder',
    'A simple 3-day full-body plan to learn the lifts and build your first real muscle.',
    'New to lifting, or coming back after a long break? Start here. Three full-body sessions rotate through the week, each built around a handful of straightforward compound and machine movements so you learn good technique while training every muscle two to three times a week — the sweet spot for a beginner.

Keep it simple: 3 sets of 8–15 reps, stop each set a rep or two shy of failure while you''re learning, and add a little weight or a rep whenever the last set feels easy. Run it as a self-paced rotation, three days a week (e.g. Mon/Wed/Fri), with a rest day between sessions.

Pair it with the Muscle-Building Surplus or Maintenance nutrition stage and be patient — the first few months build the base everything else is built on.',
    'beginner', 'sequential', 8, 3, 4, 45,
    ARRAY['barbell','dumbbell','bench','rack','cable','machine','pull_up_bar'],
    'beginner', 'published', true,
    'Learn the movement before you chase weight — technique first, always. Leave a rep or two in reserve while you''re starting out, warm up with lighter sets, and ask for a spotter on pressing. If anything hurts (not just "hard"), stop the set.',
    now()
  ) RETURNING id INTO pid;

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Full Body A', 'bmb-a', 'strength', 'Squat, press and pull — learn the big patterns.', 1, 45, 'beginner', ARRAY['Quads','Chest','Back'], 'strength') RETURNING id INTO w1;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rep_target, rest_seconds, notes) VALUES
    (w1, public._pick_ex('Goblet Squat','Quads'), 1, 3, 8, 12, NULL, 120, 'Hold a dumbbell at your chest, sit down between your knees, stay tall.'),
    (w1, public._pick_ex('Dumbbell Bench Press','Chest'), 2, 3, 8, 12, NULL, 90, 'Lower under control, press up and slightly together.'),
    (w1, public._pick_ex('Lat Pulldown','Back'), 3, 3, 10, 12, NULL, 90, 'Pull the bar to your upper chest, squeeze the shoulder blades.'),
    (w1, public._pick_ex('Dumbbell Seated Shoulder Press','Shoulders'), 4, 3, 10, 12, NULL, 90, NULL),
    (w1, public._pick_ex('Lying Leg Curl','Hamstrings'), 5, 3, 10, 15, NULL, 75, NULL),
    (w1, plank_id, 6, 3, NULL, NULL, '30s', 60, 'Straight line from head to heels — brace your abs.');

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Full Body B', 'bmb-b', 'strength', 'Legs, incline press and rows, plus arms.', 2, 45, 'beginner', ARRAY['Quads','Chest','Back','Arms'], 'strength') RETURNING id INTO w2;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, notes) VALUES
    (w2, public._pick_ex('Leg Press','Quads'), 1, 3, 10, 15, 120, 'Feet shoulder-width, control the weight down, don''t lock out hard.'),
    (w2, public._pick_ex('Incline Dumbbell Press','Chest'), 2, 3, 8, 12, 90, NULL),
    (w2, public._pick_ex('Seated Cable Row','Back'), 3, 3, 10, 12, 90, 'Sit tall, pull to your stomach, squeeze.'),
    (w2, public._pick_ex('Dumbbell Lateral Raise','Shoulders'), 4, 3, 12, 15, 60, 'Light — lead with the elbows.'),
    (w2, public._pick_ex('Barbell Curl','Biceps'), 5, 3, 10, 12, 60, NULL),
    (w2, public._pick_ex('Triceps Pushdown','Triceps'), 6, 3, 10, 15, 60, NULL);

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Full Body C', 'bmb-c', 'strength', 'Hinge, press and pull with single-leg work.', 3, 45, 'beginner', ARRAY['Hamstrings','Chest','Back'], 'strength') RETURNING id INTO w3;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, notes) VALUES
    (w3, public._pick_ex('Romanian Deadlift','Hamstrings'), 1, 3, 8, 12, 120, 'Push the hips back, soft knees, feel the hamstrings — keep the back flat.'),
    (w3, public._pick_ex('Barbell Bench Press','Chest'), 2, 3, 8, 10, 120, 'Ask for a spotter. Controlled down, drive up.'),
    (w3, public._pick_ex('Barbell Bent Over Row','Back'), 3, 3, 10, 12, 90, 'Hinge over, flat back, pull to the belly.'),
    (w3, public._pick_ex('Walking Lunge','Quads'), 4, 3, 10, 12, 75, 'Per leg — big step, tall chest, control the knee.'),
    (w3, public._pick_ex('Hammer Curl','Biceps'), 5, 3, 10, 12, 60, NULL),
    (w3, public._pick_ex('Standing Calf Raise','Calves'), 6, 3, 12, 20, 45, NULL);
END $$;
