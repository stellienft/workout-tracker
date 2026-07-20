-- Stellio Fit — Cardio content pack
-- Adds a Cardio & Endurance goal, cardio exercises (machine + bodyweight),
-- exercise alternatives, and 3 cardio programs with weeks, workouts and sets.
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING throughout.
--   New exercises: e0000000-…-000000000040 through …-00000000004d
--   New goal:      d0000000-…-00000000000c
--   New programs:  b0000000-…-00000000000e through …-000000000010
--   New workouts:  c0000000-…-0000000000d0 through …-0000000000de

-- ============================================================
-- Fitness goal: Cardio & Endurance
-- ============================================================
insert into public.fitness_goals
  (id, name, slug, short_description, long_description, cover_image_path,
   recommended_experience_levels, recommended_frequency_min, recommended_frequency_max,
   typical_session_minutes, display_order, active)
values
  ('d0000000-0000-4000-8000-00000000000c', 'Cardio & Endurance', 'cardio-endurance',
   'Build stamina, heart health and endurance.',
   'Improve your cardiovascular fitness with a mix of steady-state cardio, intervals and conditioning. Works on a treadmill, bike, rower or with nothing but your bodyweight — progress at your own pace.',
   'covers/goals/cardio-endurance.jpg', '{beginner,intermediate,advanced}', 3, 5, 35, 12, true)
on conflict (slug) do nothing;

-- ============================================================
-- Cardio exercises
-- Machine-based cardio is tagged equipment '{cardio}' so selecting the
-- "cardio" equipment option unlocks them; bodyweight cardio needs no kit.
-- ============================================================
insert into public.exercises
  (id, name, slug, category, primary_muscles, secondary_muscles, equipment, difficulty,
   instructions, technique_cues, shoulder_safe, shoulder_notes, cover_image_path, status)
values
  ('e0000000-0000-4000-8000-000000000040', 'Treadmill Run', 'treadmill-run', 'cardio',
   '{cardio}', '{quads,hamstrings,calves}', '{cardio}', 'beginner',
   'Set a comfortable running pace. Keep an upright posture, relaxed shoulders, and a steady breathing rhythm.',
   '{"Land midfoot under your hips","Relaxed shoulders and arms","Steady, conversational breathing"}',
   true, null, 'covers/exercises/treadmill-run.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000041', 'Treadmill Incline Walk', 'treadmill-incline-walk', 'cardio',
   '{cardio}', '{glutes,calves,hamstrings}', '{cardio}', 'beginner',
   'Set the incline to 6–12% and walk at a brisk pace. Avoid holding the rails so your heart rate does the work.',
   '{"Tall posture, don''t lean on the rails","Full stride, push through the heel","Brisk but sustainable pace"}',
   true, null, 'covers/exercises/treadmill-incline-walk.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000043', 'Indoor Rower', 'indoor-rower', 'cardio',
   '{cardio,back}', '{legs,biceps,core}', '{cardio}', 'beginner',
   'Drive with your legs first, then swing the torso back and finish by pulling the handle to your lower ribs. Reverse the order to return.',
   '{"Legs → hips → arms on the drive","Arms → hips → legs on the recovery","Handle to the lower ribs"}',
   true, 'A shoulder-friendly pull when you keep the finish low. Ease off if a sore shoulder complains.',
   'covers/exercises/indoor-rower.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000044', 'Elliptical Trainer', 'elliptical-trainer', 'cardio',
   '{cardio}', '{quads,glutes,hamstrings}', '{cardio}', 'beginner',
   'Stride smoothly, pushing and pulling the handles. A low-impact option that keeps stress off the joints.',
   '{"Smooth, full strides","Drive through the whole foot","Use the handles lightly"}',
   true, null, 'covers/exercises/elliptical-trainer.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000045', 'Stair Climber', 'stair-climber', 'cardio',
   '{cardio,glutes}', '{quads,calves}', '{cardio}', 'intermediate',
   'Step at a steady pace without slumping on the rails. Stand tall and drive through the whole foot on each step.',
   '{"Stand tall, light touch on the rails","Full steps, drive through the heel","Steady, controlled pace"}',
   true, null, 'covers/exercises/stair-climber.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000046', 'Air Bike', 'air-bike', 'conditioning',
   '{cardio}', '{quads,shoulders,core}', '{cardio}', 'intermediate',
   'Push and pull the handles while driving the pedals. The harder you work, the more resistance the fan gives back.',
   '{"Drive arms and legs together","Sit tall, brace the core","Match effort to the interval"}',
   true, null, 'covers/exercises/air-bike.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000047', 'Sled Push', 'sled-push', 'conditioning',
   '{quads,glutes,cardio}', '{hamstrings,calves,core}', '{cardio}', 'intermediate',
   'Lean into the sled with straight arms and drive it forward with powerful, chopping steps.',
   '{"Low body angle, straight arms","Powerful, driving steps","Keep the sled moving"}',
   true, null, 'covers/exercises/sled-push.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000048', 'Battle Ropes', 'battle-ropes', 'conditioning',
   '{cardio,shoulders}', '{core,forearms}', '{cardio}', 'beginner',
   'Hold an end of the rope in each hand and make fast, powerful waves by alternating your arms. Stay in a quarter-squat.',
   '{"Athletic quarter-squat stance","Fast waves from the shoulders","Brace the core throughout"}',
   true, 'Repetitive arm action — keep the range comfortable if your shoulder is sore, or substitute a bike sprint.',
   'covers/exercises/battle-ropes.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000049', 'Brisk Walk', 'brisk-walk', 'cardio',
   '{cardio}', '{glutes,calves}', '{bodyweight}', 'beginner',
   'Walk at a pace where you can talk but not sing. Swing the arms and keep a tall, relaxed posture.',
   '{"Purposeful, quick steps","Relaxed arm swing","Tall posture"}',
   true, null, 'covers/exercises/brisk-walk.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000004a', 'High Knees', 'high-knees', 'cardio',
   '{cardio}', '{quads,core,calves}', '{bodyweight}', 'beginner',
   'Run on the spot driving your knees up toward hip height, staying light on the balls of your feet.',
   '{"Knees to hip height","Fast feet, light landings","Pump the arms"}',
   true, null, 'covers/exercises/high-knees.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000004b', 'Butt Kicks', 'butt-kicks', 'cardio',
   '{cardio}', '{hamstrings,calves}', '{bodyweight}', 'beginner',
   'Jog on the spot flicking your heels up toward your glutes, staying light and quick.',
   '{"Heels toward the glutes","Stay tall, don''t lean forward","Quick, light rhythm"}',
   true, null, 'covers/exercises/butt-kicks.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000004c', 'Shadow Boxing', 'shadow-boxing', 'conditioning',
   '{cardio,shoulders}', '{core,forearms}', '{bodyweight}', 'beginner',
   'Throw controlled punch combinations while moving your feet, keeping your core braced and hands up.',
   '{"Light on your feet","Rotate through the hips","Hands back to guard"}',
   true, 'Keep punches controlled and within a comfortable range if the shoulder is sore.',
   'covers/exercises/shadow-boxing.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000004d', 'Squat Jumps', 'squat-jumps', 'conditioning',
   '{quads,glutes,cardio}', '{calves,hamstrings}', '{bodyweight}', 'intermediate',
   'Squat down, then explode straight up. Land softly back into the squat and immediately repeat.',
   '{"Land soft and quiet","Full squat between jumps","Explode through the whole foot"}',
   true, null, 'covers/exercises/squat-jumps.jpg', 'published')
on conflict (slug) do nothing;

-- Tag pre-existing machine cardio so selecting the "cardio" equipment option
-- surfaces them alongside the new machines. Idempotent.
update public.exercises
set equipment = '{machine,cardio}'
where slug in ('stationary-bike', 'treadmill-walk')
  and not ('cardio' = any (equipment));

-- ============================================================
-- Exercise alternatives (low-impact / equipment swaps)
-- Note: 'stationary-bike' is the pre-existing exercise …013.
-- ============================================================
insert into public.exercise_alternatives (exercise_id, alternative_exercise_id, reason, priority) values
  ('e0000000-0000-4000-8000-000000000040', 'e0000000-0000-4000-8000-000000000013', 'Lower-impact cardio on the knees', 1),
  ('e0000000-0000-4000-8000-000000000040', 'e0000000-0000-4000-8000-000000000044', 'Low-impact stride option', 2),
  ('e0000000-0000-4000-8000-000000000040', 'e0000000-0000-4000-8000-000000000049', 'No-equipment substitute', 3),
  ('e0000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-000000000044', 'Similar low-impact machine', 1),
  ('e0000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-000000000043', 'Full-body low-impact option', 2),
  ('e0000000-0000-4000-8000-000000000045', 'e0000000-0000-4000-8000-000000000041', 'Incline walk hits similar muscles', 1),
  ('e0000000-0000-4000-8000-000000000046', 'e0000000-0000-4000-8000-000000000013', 'Bike sprints as a substitute', 1),
  ('e0000000-0000-4000-8000-000000000048', 'e0000000-0000-4000-8000-000000000046', 'Air bike for arms + legs conditioning', 1),
  ('e0000000-0000-4000-8000-00000000004d', 'e0000000-0000-4000-8000-000000000028', 'Box jump — lower-impact landing', 1),
  ('e0000000-0000-4000-8000-00000000004a', 'e0000000-0000-4000-8000-00000000002e', 'Jumping jacks as a substitute', 1),
  ('e0000000-0000-4000-8000-000000000041', 'e0000000-0000-4000-8000-000000000049', 'Outdoor/brisk walk substitute', 1)
on conflict (exercise_id, alternative_exercise_id) do nothing;

-- ============================================================
-- Programs
-- ============================================================
insert into public.programs
  (id, fitness_goal_id, name, slug, short_description, description, cover_image_path,
   experience_level, scheduling_mode, duration_weeks, minimum_days_per_week, maximum_days_per_week,
   estimated_session_minutes, equipment_requirements, difficulty, status, featured, safety_notes, published_at, version)
values
  ('b0000000-0000-4000-8000-00000000000e',
   'd0000000-0000-4000-8000-00000000000c',
   'Cardio Kickstart', 'cardio-kickstart',
   'A 4-week on-ramp to build your cardio base with steady sessions and gentle intervals.',
   'The perfect entry point to cardio training. Three rotating sessions blend steady-state work with beginner-friendly intervals and a light conditioning circuit. Works on any machine or with just your bodyweight, and scales as your fitness grows.',
   'covers/programs/cardio-kickstart.jpg',
   'beginner', 'sequential', 4, 3, 4, 30,
   '{cardio,bodyweight}', 'beginner', 'published', true,
   'Build gradually — keep steady sessions conversational. Stop if you feel dizzy or short of breath beyond normal exertion.',
   now(), 1),

  ('b0000000-0000-4000-8000-00000000000f',
   'd0000000-0000-4000-8000-000000000002',
   'HIIT Shred', 'hiit-shred',
   'A 6-week high-intensity interval program to torch calories and boost conditioning.',
   'Short, intense interval sessions that spike your heart rate and keep it there. Three rotating workouts mix bodyweight HIIT, Tabata-style blasts, and cardio-core finishers. Big results in 30 minutes — pairs perfectly with a fat-loss nutrition plan.',
   'covers/programs/hiit-shred.jpg',
   'intermediate', 'sequential', 6, 3, 4, 30,
   '{bodyweight,cardio}', 'intermediate', 'published', true,
   'High intensity — warm up first and keep at least one full rest day between sessions. Scale the work intervals to your level.',
   now(), 1),

  ('b0000000-0000-4000-8000-000000000010',
   'd0000000-0000-4000-8000-00000000000c',
   '5K Builder', 'five-k-builder',
   'An 8-week run/walk progression that takes you from the couch to a continuous 5K.',
   'A gradual, proven run/walk method that builds you up to running 5 kilometres non-stop. Three sessions a week progressively increase your running intervals while reducing walking breaks. Works on a treadmill or outdoors.',
   'covers/programs/five-k-builder.jpg',
   'beginner', 'sequential', 8, 3, 3, 35,
   '{cardio,bodyweight}', 'beginner', 'published', false,
   'Progress at your own pace — repeat a week if you need to. Easy, conversational effort on the run intervals; walk breaks should feel like real recovery.',
   now(), 1)
on conflict (slug) do nothing;

-- ============================================================
-- Program weeks
-- ============================================================
insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-00000000000e', 1, 'Base', 'Ease in, build the habit', false, 'Keep steady work conversational.'),
  ('b0000000-0000-4000-8000-00000000000e', 2, 'Build', 'Add a little time and intensity', false, null),
  ('b0000000-0000-4000-8000-00000000000e', 3, 'Push', 'Longer intervals', false, null),
  ('b0000000-0000-4000-8000-00000000000e', 4, 'Consolidate', 'Lock in your new base', false, 'Notice how much easier week 1 would feel now.')
on conflict (program_id, week_number) do nothing;

insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-00000000000f', 1, 'Foundation', 'Learn the intervals', false, 'Master form before max effort.'),
  ('b0000000-0000-4000-8000-00000000000f', 2, 'Build', 'Increase work intervals', false, null),
  ('b0000000-0000-4000-8000-00000000000f', 3, 'Build', 'Continue progression', false, null),
  ('b0000000-0000-4000-8000-00000000000f', 4, 'Deload', 'Lighter recovery week', true, 'Reduce rounds ~30%.'),
  ('b0000000-0000-4000-8000-00000000000f', 5, 'Peak', 'Highest intensity', false, null),
  ('b0000000-0000-4000-8000-00000000000f', 6, 'Finish', 'Best effort of the program', false, null)
on conflict (program_id, week_number) do nothing;

insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-000000000010', 1, 'Week 1', 'Run 1 min / walk 2 min', false, null),
  ('b0000000-0000-4000-8000-000000000010', 2, 'Week 2', 'Run 90s / walk 2 min', false, null),
  ('b0000000-0000-4000-8000-000000000010', 3, 'Week 3', 'Run 3 min / walk 90s', false, null),
  ('b0000000-0000-4000-8000-000000000010', 4, 'Week 4', 'Run 5 min / walk 90s', false, null),
  ('b0000000-0000-4000-8000-000000000010', 5, 'Week 5', 'Run 8 min / walk 2 min', false, null),
  ('b0000000-0000-4000-8000-000000000010', 6, 'Week 6', 'Run 12 min / walk 2 min', false, null),
  ('b0000000-0000-4000-8000-000000000010', 7, 'Week 7', 'Run 20 min continuous', false, null),
  ('b0000000-0000-4000-8000-000000000010', 8, 'Week 8', 'Run 5K continuous', false, 'You''ve got this — steady, conversational pace.')
on conflict (program_id, week_number) do nothing;

-- ============================================================
-- Workout templates
-- ============================================================
insert into public.workout_templates
  (id, program_id, name, slug, category, description, cover_image_path,
   sequence_order, week_position, day_of_week, estimated_minutes, difficulty,
   target_muscle_groups, is_optional, workout_type)
values
  -- Cardio Kickstart (sequential, 3 + optional)
  ('c0000000-0000-4000-8000-0000000000d0', 'b0000000-0000-4000-8000-00000000000e',
   'Steady Base', 'ck-steady-base', 'cardio',
   'A single steady-state cardio effort to build your aerobic base.',
   'covers/workouts/ck-steady-base.jpg', 1, null, null, 30, 'beginner',
   '{cardio}', false, 'cardio'),
  ('c0000000-0000-4000-8000-0000000000d1', 'b0000000-0000-4000-8000-00000000000e',
   'Interval Starter', 'ck-interval-starter', 'cardio',
   'Beginner intervals alternating harder efforts with easy recovery.',
   'covers/workouts/ck-interval-starter.jpg', 2, null, null, 28, 'beginner',
   '{cardio}', false, 'conditioning'),
  ('c0000000-0000-4000-8000-0000000000d2', 'b0000000-0000-4000-8000-00000000000e',
   'Cardio Circuit', 'ck-cardio-circuit', 'cardio',
   'A bodyweight cardio circuit you can do anywhere.',
   'covers/workouts/ck-cardio-circuit.jpg', 3, null, null, 25, 'beginner',
   '{cardio,core}', false, 'conditioning'),
  ('c0000000-0000-4000-8000-0000000000d3', 'b0000000-0000-4000-8000-00000000000e',
   'Recovery Walk', 'ck-recovery-walk', 'cardio',
   'Optional easy walk for active recovery.',
   'covers/workouts/ck-recovery-walk.jpg', null, null, null, 25, 'beginner',
   '{cardio}', true, 'cardio'),

  -- HIIT Shred (sequential, 3 days)
  ('c0000000-0000-4000-8000-0000000000d4', 'b0000000-0000-4000-8000-00000000000f',
   'HIIT Full Body', 'hs-hiit-full-body', 'conditioning',
   'Full-body high-intensity intervals: 40s work / 20s rest.',
   'covers/workouts/hs-hiit-full-body.jpg', 1, null, null, 30, 'intermediate',
   '{cardio,legs,core}', false, 'conditioning'),
  ('c0000000-0000-4000-8000-0000000000d5', 'b0000000-0000-4000-8000-00000000000f',
   'Tabata Blast', 'hs-tabata-blast', 'conditioning',
   'Tabata intervals — 20s all-out / 10s rest, 8 rounds per move.',
   'covers/workouts/hs-tabata-blast.jpg', 2, null, null, 26, 'intermediate',
   '{cardio,legs}', false, 'conditioning'),
  ('c0000000-0000-4000-8000-0000000000d6', 'b0000000-0000-4000-8000-00000000000f',
   'Cardio & Core', 'hs-cardio-core', 'conditioning',
   'Intervals paired with core work for conditioning and a strong midsection.',
   'covers/workouts/hs-cardio-core.jpg', 3, null, null, 28, 'intermediate',
   '{cardio,core}', false, 'conditioning'),

  -- 5K Builder (sequential, 3 days)
  ('c0000000-0000-4000-8000-0000000000d7', 'b0000000-0000-4000-8000-000000000010',
   'Run/Walk Intervals', 'fk-run-walk', 'cardio',
   'The core run/walk session — follow this week''s run and walk intervals.',
   'covers/workouts/fk-run-walk.jpg', 1, null, null, 32, 'beginner',
   '{cardio}', false, 'cardio'),
  ('c0000000-0000-4000-8000-0000000000d8', 'b0000000-0000-4000-8000-000000000010',
   'Steady Effort', 'fk-steady-effort', 'cardio',
   'A steadier session to build aerobic endurance between run/walk days.',
   'covers/workouts/fk-steady-effort.jpg', 2, null, null, 30, 'beginner',
   '{cardio}', false, 'cardio'),
  ('c0000000-0000-4000-8000-0000000000d9', 'b0000000-0000-4000-8000-000000000010',
   'Long Run/Walk', 'fk-long-run-walk', 'cardio',
   'The longest session of the week to build endurance and confidence.',
   'covers/workouts/fk-long-run-walk.jpg', 3, null, null, 40, 'beginner',
   '{cardio}', false, 'cardio')
on conflict (program_id, slug) do nothing;

-- ============================================================
-- Workout template exercises
-- (template_id, exercise_id, position, sets, rep_min, rep_max, rep_target, rest, notes, is_optional)
-- ============================================================
insert into public.workout_template_exercises
  (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rep_target, rest_seconds, notes, is_optional)
values
  -- Cardio Kickstart: Steady Base
  ('c0000000-0000-4000-8000-0000000000d0', 'e0000000-0000-4000-8000-000000000041', 1, 1, null, null, '5 min warm-up', 0, 'Easy pace to warm up.', false),
  ('c0000000-0000-4000-8000-0000000000d0', 'e0000000-0000-4000-8000-000000000040', 2, 1, null, null, '20 min steady', 0, 'Conversational pace. Bike or walk if preferred.', false),
  ('c0000000-0000-4000-8000-0000000000d0', 'e0000000-0000-4000-8000-000000000049', 3, 1, null, null, '5 min cool-down', 0, 'Easy walk to finish.', false),

  -- Cardio Kickstart: Interval Starter
  ('c0000000-0000-4000-8000-0000000000d1', 'e0000000-0000-4000-8000-000000000049', 1, 1, null, null, '5 min warm-up', 0, 'Brisk walk to warm up.', false),
  ('c0000000-0000-4000-8000-0000000000d1', 'e0000000-0000-4000-8000-000000000013', 2, 6, null, null, '1 min hard / 90s easy', 0, '6 rounds. Bike, row or run.', false),
  ('c0000000-0000-4000-8000-0000000000d1', 'e0000000-0000-4000-8000-000000000049', 3, 1, null, null, '5 min cool-down', 0, null, false),

  -- Cardio Kickstart: Cardio Circuit
  ('c0000000-0000-4000-8000-0000000000d2', 'e0000000-0000-4000-8000-00000000002e', 1, 3, null, null, '40s on / 20s off', 20, 'Jumping jacks.', false),
  ('c0000000-0000-4000-8000-0000000000d2', 'e0000000-0000-4000-8000-00000000004a', 2, 3, null, null, '40s on / 20s off', 20, 'High knees.', false),
  ('c0000000-0000-4000-8000-0000000000d2', 'e0000000-0000-4000-8000-00000000002d', 3, 3, null, null, '40s on / 20s off', 20, 'Mountain climbers.', false),
  ('c0000000-0000-4000-8000-0000000000d2', 'e0000000-0000-4000-8000-00000000004b', 4, 3, null, null, '40s on / 20s off', 60, 'Butt kicks. Rest 60s after each round.', false),

  -- Cardio Kickstart: Recovery Walk (optional)
  ('c0000000-0000-4000-8000-0000000000d3', 'e0000000-0000-4000-8000-000000000049', 1, 1, null, null, '25 min easy', 0, 'Relaxed pace. Enjoy it.', false),

  -- HIIT Shred: HIIT Full Body
  ('c0000000-0000-4000-8000-0000000000d4', 'e0000000-0000-4000-8000-00000000004a', 1, 1, null, null, '4 min warm-up', 0, 'High knees + easy movement.', false),
  ('c0000000-0000-4000-8000-0000000000d4', 'e0000000-0000-4000-8000-00000000002f', 2, 4, null, null, '40s on / 20s off', 20, 'Burpees.', false),
  ('c0000000-0000-4000-8000-0000000000d4', 'e0000000-0000-4000-8000-00000000004d', 3, 4, null, null, '40s on / 20s off', 20, 'Squat jumps.', false),
  ('c0000000-0000-4000-8000-0000000000d4', 'e0000000-0000-4000-8000-00000000002d', 4, 4, null, null, '40s on / 20s off', 20, 'Mountain climbers.', false),
  ('c0000000-0000-4000-8000-0000000000d4', 'e0000000-0000-4000-8000-00000000003a', 5, 4, null, null, '40s on / 20s off', 60, 'Skater hops. Rest 60s between rounds.', false),

  -- HIIT Shred: Tabata Blast
  ('c0000000-0000-4000-8000-0000000000d5', 'e0000000-0000-4000-8000-000000000049', 1, 1, null, null, '4 min warm-up', 0, 'Brisk walk / easy jog.', false),
  ('c0000000-0000-4000-8000-0000000000d5', 'e0000000-0000-4000-8000-00000000004d', 2, 8, null, null, '20s on / 10s off', 60, 'Squat jumps. 8 rounds, then rest 60s.', false),
  ('c0000000-0000-4000-8000-0000000000d5', 'e0000000-0000-4000-8000-000000000032', 3, 8, null, null, '20s on / 10s off', 60, 'Jump rope (or fast feet). 8 rounds.', false),
  ('c0000000-0000-4000-8000-0000000000d5', 'e0000000-0000-4000-8000-00000000002f', 4, 8, null, null, '20s on / 10s off', 0, 'Burpees. 8 rounds.', false),

  -- HIIT Shred: Cardio & Core
  ('c0000000-0000-4000-8000-0000000000d6', 'e0000000-0000-4000-8000-000000000048', 1, 4, null, null, '30s on / 30s off', 0, 'Battle ropes (or fast arm swings).', false),
  ('c0000000-0000-4000-8000-0000000000d6', 'e0000000-0000-4000-8000-00000000000a', 2, 4, null, null, '45s hold', 30, 'Plank hold.', false),
  ('c0000000-0000-4000-8000-0000000000d6', 'e0000000-0000-4000-8000-00000000002c', 3, 4, 20, 30, null, 30, 'Russian twists.', false),
  ('c0000000-0000-4000-8000-0000000000d6', 'e0000000-0000-4000-8000-00000000004c', 4, 4, null, null, '45s on / 15s off', 45, 'Shadow boxing. Rest 45s between rounds.', false),

  -- 5K Builder: Run/Walk Intervals
  ('c0000000-0000-4000-8000-0000000000d7', 'e0000000-0000-4000-8000-000000000049', 1, 1, null, null, '5 min warm-up walk', 0, 'Brisk walk to warm up.', false),
  ('c0000000-0000-4000-8000-0000000000d7', 'e0000000-0000-4000-8000-000000000040', 2, 8, null, null, 'This week''s run interval', 0, 'Follow the week''s run/walk split (see program week notes).', false),
  ('c0000000-0000-4000-8000-0000000000d7', 'e0000000-0000-4000-8000-000000000049', 3, 1, null, null, '5 min cool-down walk', 0, null, false),

  -- 5K Builder: Steady Effort
  ('c0000000-0000-4000-8000-0000000000d8', 'e0000000-0000-4000-8000-000000000049', 1, 1, null, null, '5 min warm-up walk', 0, null, false),
  ('c0000000-0000-4000-8000-0000000000d8', 'e0000000-0000-4000-8000-000000000041', 2, 1, null, null, '20 min steady', 0, 'Incline walk or easy jog. Bike/elliptical also fine.', false),
  ('c0000000-0000-4000-8000-0000000000d8', 'e0000000-0000-4000-8000-000000000049', 3, 1, null, null, '5 min cool-down walk', 0, null, false),

  -- 5K Builder: Long Run/Walk
  ('c0000000-0000-4000-8000-0000000000d9', 'e0000000-0000-4000-8000-000000000049', 1, 1, null, null, '5 min warm-up walk', 0, null, false),
  ('c0000000-0000-4000-8000-0000000000d9', 'e0000000-0000-4000-8000-000000000040', 2, 1, null, null, 'Longest run/walk of the week', 0, 'Go a little further than your interval day. Keep it easy.', false),
  ('c0000000-0000-4000-8000-0000000000d9', 'e0000000-0000-4000-8000-000000000049', 3, 1, null, null, '5 min cool-down walk', 0, null, false)
on conflict do nothing;
