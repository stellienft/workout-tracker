-- Three original, bodybuilding-style programs mapped to training stages:
--   * Mass Blueprint     — Push/Pull/Legs, the muscle-building (bulk) phase
--   * Classic Physique Split — a 5-day body-part split for size & aesthetics
--   * Shred & Define     — a 4-day, higher-rep, superset-driven cut
-- Original programming built on well-known hypertrophy training principles; not
-- affiliated with any brand or coach. Re-runnable (rebuilds by slug).

DO $$
DECLARE
  pid uuid;
  w1 uuid; w2 uuid; w3 uuid; w4 uuid; w5 uuid;
  -- Exact-name references for movements _pick_ex resolves poorly.
  incline_bb uuid := (SELECT id FROM public.exercises WHERE name = 'Barbell Incline Bench Press' ORDER BY (status='published') DESC LIMIT 1);
  pullup     uuid := (SELECT id FROM public.exercises WHERE name = 'Pull-Up' ORDER BY (status='published') DESC LIMIT 1);
  chest_fly  uuid := (SELECT id FROM public.exercises WHERE name = 'Cable Standing Fly' ORDER BY (status='published') DESC LIMIT 1);
  rear_delt  uuid := (SELECT id FROM public.exercises WHERE name = 'Dumbbell Reverse Fly' ORDER BY (status='published') DESC LIMIT 1);
BEGIN
  -- =====================================================================
  -- 1) MASS BLUEPRINT — Push / Pull / Legs (bulk / muscle-building stage)
  -- =====================================================================
  DELETE FROM public.programs WHERE slug = 'mass-blueprint';
  INSERT INTO public.programs (
    name, slug, short_description, description, experience_level, scheduling_mode,
    duration_weeks, minimum_days_per_week, maximum_days_per_week, estimated_session_minutes,
    equipment_requirements, difficulty, status, featured, safety_notes, published_at
  ) VALUES (
    'Mass Blueprint',
    'mass-blueprint',
    'A high-volume push/pull/legs built for size — the muscle-building phase.',
    'A classic push/pull/legs split built for hypertrophy. Most work sits in the 8–12 rep range with a few heavier compounds, moderate rest and enough volume per muscle to drive real growth.

Run the three sessions as a self-paced rotation — three days a week hits everything once, six days a week hits everything twice. Progress is simple: add a rep or a little weight whenever you can, and keep the last rep or two of most sets hard but clean.

Pair it with the Muscle-Building Surplus nutrition stage — a slight calorie surplus and plenty of protein — to give the training something to build with.',
    'intermediate', 'sequential', 10, 3, 6, 65,
    ARRAY['barbell','dumbbell','bench','rack','cable','machine','pull_up_bar'],
    'intermediate', 'published', true,
    'Warm up and ramp to your working weights. Keep technique clean and stop a set if form breaks down. Use a spotter or safeties on heavy bench and squat.',
    now()
  ) RETURNING id INTO pid;

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Push', 'mb-push', 'strength', 'Chest, shoulders and triceps — press heavy, then chase the pump.', 1, 65, 'intermediate', ARRAY['Chest','Shoulders','Triceps'], 'strength') RETURNING id INTO w1;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, notes) VALUES
    (w1, public._pick_ex('Barbell Bench Press','Chest'), 1, 4, 6, 8, 150, 'Your main press — controlled, powerful, progress the load over time.'),
    (w1, incline_bb, 2, 3, 8, 10, 120, NULL),
    (w1, public._pick_ex('Barbell Seated Overhead Press','Shoulders'), 3, 3, 8, 10, 120, NULL),
    (w1, chest_fly, 4, 3, 12, 15, 75, 'Full stretch, squeeze at the top.'),
    (w1, public._pick_ex('Dumbbell Lateral Raise','Shoulders'), 5, 4, 12, 20, 45, 'Light and strict — build the side delts.'),
    (w1, public._pick_ex('Triceps Pushdown','Triceps'), 6, 3, 10, 15, 60, NULL),
    (w1, public._pick_ex('Overhead Triceps Extension','Triceps'), 7, 3, 10, 12, 60, NULL);

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Pull', 'mb-pull', 'strength', 'Back and biceps — pull heavy, own every rep.', 2, 65, 'intermediate', ARRAY['Back','Biceps'], 'strength') RETURNING id INTO w2;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, notes) VALUES
    (w2, public._pick_ex('Barbell Deadlift','Back'), 1, 3, 5, 5, 180, 'Set the back, brace, pull with intent. Reset each rep.'),
    (w2, pullup, 2, 4, 6, 10, 120, 'Add weight if you can clear the top of the range; assist if you cannot.'),
    (w2, public._pick_ex('Barbell Bent Over Row','Back'), 3, 3, 8, 10, 120, NULL),
    (w2, public._pick_ex('Seated Cable Row','Back'), 4, 3, 10, 12, 90, NULL),
    (w2, public._pick_ex('Face Pull','Shoulders'), 5, 3, 15, 20, 60, 'Rear delts and upper back — great for posture.'),
    (w2, public._pick_ex('Barbell Curl','Biceps'), 6, 3, 8, 12, 60, NULL),
    (w2, public._pick_ex('Hammer Curl','Biceps'), 7, 3, 10, 15, 60, NULL);

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Legs', 'mb-legs', 'strength', 'Quads, hamstrings, glutes and calves — the growth engine.', 3, 65, 'intermediate', ARRAY['Quads','Hamstrings','Glutes','Calves'], 'strength') RETURNING id INTO w3;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, notes) VALUES
    (w3, public._pick_ex('Barbell Full Squat','Quads'), 1, 4, 6, 8, 180, 'The centrepiece. Brace hard, drive through mid-foot.'),
    (w3, public._pick_ex('Romanian Deadlift','Hamstrings'), 2, 3, 8, 10, 120, 'Hinge, feel the hamstrings load, neutral spine.'),
    (w3, public._pick_ex('Leg Press','Quads'), 3, 3, 10, 15, 120, NULL),
    (w3, public._pick_ex('Lying Leg Curl','Hamstrings'), 4, 3, 10, 15, 75, NULL),
    (w3, public._pick_ex('Leg Extension','Quads'), 5, 3, 15, 20, 60, NULL),
    (w3, public._pick_ex('Standing Calf Raise','Calves'), 6, 4, 12, 20, 45, 'Full stretch and squeeze each rep.');

  -- =====================================================================
  -- 2) CLASSIC PHYSIQUE SPLIT — 5-day body-part split (size & aesthetics)
  -- =====================================================================
  DELETE FROM public.programs WHERE slug = 'classic-physique-split';
  INSERT INTO public.programs (
    name, slug, short_description, description, experience_level, scheduling_mode,
    duration_weeks, minimum_days_per_week, maximum_days_per_week, estimated_session_minutes,
    equipment_requirements, difficulty, status, featured, safety_notes, published_at
  ) VALUES (
    'Classic Physique Split',
    'classic-physique-split',
    'The classic five-day body-part split — a dedicated day for chest, back, shoulders, legs and arms.',
    'The old-school bodybuilding split: hit one region hard each session — chest, back, shoulders, legs, then arms — with enough volume and variety to bring up every muscle.

Best for lifters with a training base who can recover from focused, high-volume work. Run it as a self-paced rotation; four to five days a week is the sweet spot. Train each set close to failure, chase a full range of motion, and add load or reps over time.',
    'advanced', 'sequential', 10, 4, 5, 60,
    ARRAY['barbell','dumbbell','bench','rack','cable','machine','pull_up_bar'],
    'advanced', 'published', true,
    'This is high-volume training — build up to it. Warm up each region, keep technique tight, and manage recovery (sleep and food) so the volume works for you rather than against you.',
    now()
  ) RETURNING id INTO pid;

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Chest', 'cps-chest', 'strength', 'Press and fly from every angle for a fuller chest.', 1, 60, 'advanced', ARRAY['Chest','Triceps'], 'strength') RETURNING id INTO w1;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, notes) VALUES
    (w1, public._pick_ex('Barbell Bench Press','Chest'), 1, 4, 6, 8, 150, 'Heaviest press of the day.'),
    (w1, incline_bb, 2, 3, 8, 10, 120, 'Upper chest focus.'),
    (w1, public._pick_ex('Dumbbell Bench Press','Chest'), 3, 3, 8, 12, 90, NULL),
    (w1, chest_fly, 4, 3, 12, 15, 60, 'Stretch and squeeze.'),
    (w1, public._pick_ex('Dips','Triceps'), 5, 3, 8, 12, 90, 'Lean forward to bias the chest.');

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Back', 'cps-back', 'strength', 'Width and thickness — vertical and horizontal pulls.', 2, 60, 'advanced', ARRAY['Back','Biceps'], 'strength') RETURNING id INTO w2;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, notes) VALUES
    (w2, public._pick_ex('Barbell Deadlift','Back'), 1, 3, 5, 5, 180, 'Reset every rep; pull with intent.'),
    (w2, pullup, 2, 4, 6, 10, 120, 'Build width — add weight when you can.'),
    (w2, public._pick_ex('Barbell Bent Over Row','Back'), 3, 3, 8, 10, 120, 'Thickness — pull to the lower ribs.'),
    (w2, public._pick_ex('Seated Cable Row','Back'), 4, 3, 10, 12, 90, NULL),
    (w2, public._pick_ex('Lat Pulldown','Back'), 5, 3, 10, 15, 75, NULL),
    (w2, public._pick_ex('Face Pull','Shoulders'), 6, 3, 15, 20, 60, NULL);

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Shoulders', 'cps-shoulders', 'strength', 'Round, capped delts from front to rear.', 3, 55, 'advanced', ARRAY['Shoulders','Traps'], 'strength') RETURNING id INTO w3;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, notes) VALUES
    (w3, public._pick_ex('Barbell Seated Overhead Press','Shoulders'), 1, 4, 6, 10, 150, 'Main overhead press.'),
    (w3, public._pick_ex('Arnold Press','Shoulders'), 2, 3, 8, 12, 90, NULL),
    (w3, public._pick_ex('Dumbbell Lateral Raise','Shoulders'), 3, 4, 12, 20, 45, 'Side-delt width — strict.'),
    (w3, rear_delt, 4, 3, 15, 20, 45, 'Rear delts — light and controlled.'),
    (w3, public._pick_ex('Dumbbell Front Raise','Shoulders'), 5, 3, 12, 15, 45, NULL),
    (w3, public._pick_ex('Dumbbell Shrug','Traps'), 6, 3, 10, 15, 60, 'Hold the top for a beat.');

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Legs', 'cps-legs', 'strength', 'Quads, hamstrings, glutes and calves — no skipping.', 4, 65, 'advanced', ARRAY['Quads','Hamstrings','Glutes','Calves'], 'strength') RETURNING id INTO w4;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, notes) VALUES
    (w4, public._pick_ex('Barbell Full Squat','Quads'), 1, 4, 6, 10, 180, 'The king of leg builders.'),
    (w4, public._pick_ex('Leg Press','Quads'), 2, 4, 10, 15, 120, NULL),
    (w4, public._pick_ex('Romanian Deadlift','Hamstrings'), 3, 3, 8, 12, 120, NULL),
    (w4, public._pick_ex('Lying Leg Curl','Hamstrings'), 4, 3, 10, 15, 75, NULL),
    (w4, public._pick_ex('Leg Extension','Quads'), 5, 3, 15, 20, 60, NULL),
    (w4, public._pick_ex('Standing Calf Raise','Calves'), 6, 4, 12, 20, 45, NULL),
    (w4, public._pick_ex('Seated Calf Raise','Calves'), 7, 3, 15, 20, 45, NULL);

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Arms', 'cps-arms', 'strength', 'Biceps and triceps supersets for the pump.', 5, 50, 'advanced', ARRAY['Biceps','Triceps'], 'strength') RETURNING id INTO w5;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, superset_group, notes) VALUES
    (w5, public._pick_ex('Barbell Curl','Biceps'), 1, 4, 8, 12, 75, 1, 'Strict — no swinging.'),
    (w5, public._pick_ex('Close-Grip Bench Press','Triceps'), 2, 4, 8, 12, 75, 1, 'Superset with the curl.'),
    (w5, public._pick_ex('Preacher Curl','Biceps'), 3, 3, 10, 12, 60, 2, NULL),
    (w5, public._pick_ex('Overhead Triceps Extension','Triceps'), 4, 3, 10, 12, 60, 2, NULL),
    (w5, public._pick_ex('Hammer Curl','Biceps'), 5, 3, 10, 15, 45, 3, NULL),
    (w5, public._pick_ex('Triceps Pushdown','Triceps'), 6, 3, 12, 15, 45, 3, NULL);

  -- =====================================================================
  -- 3) SHRED & DEFINE — 4-day, higher-rep, superset-driven cut
  -- =====================================================================
  DELETE FROM public.programs WHERE slug = 'shred-and-define';
  INSERT INTO public.programs (
    name, slug, short_description, description, experience_level, scheduling_mode,
    duration_weeks, minimum_days_per_week, maximum_days_per_week, estimated_session_minutes,
    equipment_requirements, difficulty, status, featured, safety_notes, published_at
  ) VALUES (
    'Shred & Define',
    'shred-and-define',
    'Higher reps, supersets and short rest to hold muscle while you lean out.',
    'Built for the cutting phase. The job here is to keep the muscle you have while the fat comes off, so the lifts stay hard and heavy-ish but the reps run higher (10–20), rest is short, and paired supersets keep the intensity — and the calorie burn — up. A conditioning finisher caps some sessions.

Run the four sessions as a self-paced rotation, four to five days a week. Keep pushing the weights: trying to get stronger in a deficit is what tells your body to hold on to muscle.

Pair it with the Cutting / Fat-Loss nutrition stage — a moderate calorie deficit with protein kept high.',
    'intermediate', 'sequential', 8, 4, 5, 50,
    ARRAY['barbell','dumbbell','bench','rack','cable','machine','pull_up_bar','kettlebell'],
    'intermediate', 'published', true,
    'Short rest and supersets are demanding — keep technique clean as you fatigue. Stay hydrated, and if a movement feels off under fatigue, stop the set. Ease into the conditioning finishers.',
    now()
  ) RETURNING id INTO pid;

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Upper', 'snd-upper', 'strength', 'Whole upper body, paired supersets, short rest.', 1, 50, 'intermediate', ARRAY['Chest','Back','Shoulders','Arms'], 'strength') RETURNING id INTO w1;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, superset_group, notes) VALUES
    (w1, public._pick_ex('Barbell Bench Press','Chest'), 1, 4, 10, 12, 75, 1, NULL),
    (w1, public._pick_ex('Barbell Bent Over Row','Back'), 2, 4, 10, 12, 75, 1, 'Superset with the bench.'),
    (w1, public._pick_ex('Dumbbell Seated Shoulder Press','Shoulders'), 3, 3, 12, 15, 60, 2, NULL),
    (w1, public._pick_ex('Lat Pulldown','Back'), 4, 3, 12, 15, 60, 2, NULL),
    (w1, public._pick_ex('Triceps Pushdown','Triceps'), 5, 3, 15, 20, 45, 3, NULL),
    (w1, public._pick_ex('Barbell Curl','Biceps'), 6, 3, 12, 15, 45, 3, NULL);

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Lower', 'snd-lower', 'strength', 'Legs with a kettlebell finisher.', 2, 50, 'intermediate', ARRAY['Quads','Hamstrings','Glutes','Calves'], 'strength') RETURNING id INTO w2;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, superset_group, notes) VALUES
    (w2, public._pick_ex('Barbell Full Squat','Quads'), 1, 4, 10, 12, 90, NULL, NULL),
    (w2, public._pick_ex('Romanian Deadlift','Hamstrings'), 2, 3, 12, 15, 75, NULL, NULL),
    (w2, public._pick_ex('Walking Lunge','Quads'), 3, 3, 12, 20, 60, NULL, 'Per leg.'),
    (w2, public._pick_ex('Lying Leg Curl','Hamstrings'), 4, 3, 15, 20, 45, 4, NULL),
    (w2, public._pick_ex('Leg Extension','Quads'), 5, 3, 15, 20, 45, 4, 'Superset with the leg curl.'),
    (w2, public._pick_ex('Standing Calf Raise','Calves'), 6, 4, 15, 20, 30, NULL, NULL),
    (w2, public._pick_ex('Kettlebell Swing','Glutes'), 7, 3, 20, 20, 45, NULL, 'Finisher — explosive hips, controlled breathing.');

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Push / Pull', 'snd-pushpull', 'strength', 'Chest and back supersets, delts and rear delts.', 3, 50, 'intermediate', ARRAY['Chest','Back','Shoulders'], 'strength') RETURNING id INTO w3;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, superset_group, notes) VALUES
    (w3, incline_bb, 1, 4, 10, 12, 75, NULL, NULL),
    (w3, pullup, 2, 4, 8, 12, 75, NULL, 'As many clean reps as you can; assist if needed.'),
    (w3, chest_fly, 3, 3, 15, 20, 45, 5, NULL),
    (w3, public._pick_ex('Seated Cable Row','Back'), 4, 3, 12, 15, 45, 5, 'Superset with the fly.'),
    (w3, public._pick_ex('Dumbbell Lateral Raise','Shoulders'), 5, 3, 15, 20, 30, 6, NULL),
    (w3, public._pick_ex('Face Pull','Shoulders'), 6, 3, 15, 20, 30, 6, NULL);

  INSERT INTO public.workout_templates (program_id, name, slug, category, description, sequence_order, estimated_minutes, difficulty, target_muscle_groups, workout_type)
  VALUES (pid, 'Full Body Burn', 'snd-conditioning', 'strength', 'Full-body circuit with a core and kettlebell finish.', 4, 45, 'intermediate', ARRAY['Quads','Chest','Core','Glutes'], 'conditioning') RETURNING id INTO w4;
  INSERT INTO public.workout_template_exercises (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, superset_group, notes) VALUES
    (w4, public._pick_ex('Goblet Squat','Quads'), 1, 3, 15, 20, 45, 7, NULL),
    (w4, public._pick_ex('Dumbbell Bench Press','Chest'), 2, 3, 12, 15, 45, 7, 'Superset with the goblet squat.'),
    (w4, public._pick_ex('Bulgarian Split Squat','Quads'), 3, 3, 12, 15, 60, NULL, 'Per leg.'),
    (w4, public._pick_ex('Cable Kneeling Crunch','Core'), 4, 3, 15, 20, 30, 8, NULL),
    (w4, public._pick_ex('Hanging Leg Raise','Core'), 5, 3, 12, 15, 30, 8, NULL),
    (w4, public._pick_ex('Kettlebell Swing','Glutes'), 6, 4, 20, 20, 45, NULL, 'Finisher.');
END $$;
