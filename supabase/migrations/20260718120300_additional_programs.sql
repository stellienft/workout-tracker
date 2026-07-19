-- Stellio Fit — 9 new programs with exercises, workout templates, and sets
-- Idempotent: uses fixed UUIDs + ON CONFLICT DO NOTHING throughout.
-- New exercises: e0000000-0000-4000-8000-000000000020 through 00000000003e
-- New programs:  b0000000-0000-4000-8000-000000000005 through 00000000000d
-- New workouts:  c0000000-0000-4000-8000-000000000041 through 0000000000xx

-- ============================================================
-- New exercises
-- ============================================================
insert into public.exercises
  (id, name, slug, category, primary_muscles, secondary_muscles, equipment, difficulty,
   instructions, technique_cues, shoulder_safe, shoulder_notes, cover_image_path, status)
values
  ('e0000000-0000-4000-8000-000000000020', 'Barbell Back Squat', 'barbell-back-squat', 'strength',
   '{quads,glutes}', '{hamstrings,core}', '{barbell}', 'intermediate',
   'Bar across your upper traps, feet shoulder-width. Brace, sit down between your hips, then drive up through the midfoot.',
   '{"Knees track over toes","Chest tall throughout","Brace before each rep"}',
   true, null, 'covers/exercises/barbell-back-squat.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000021', 'Bench Press (Barbell)', 'bench-press-barbell', 'strength',
   '{chest}', '{triceps,front_delts}', '{barbell,bench}', 'intermediate',
   'Grip slightly wider than shoulder-width. Lower the bar to your lower chest, then press up and slightly back.',
   '{"Shoulder blades pinned back","Feet planted","Control the descent"}',
   false, 'Bar path is fixed — keep range pain-free with a sore shoulder. Use dumbbells or machine press if needed.',
   'covers/exercises/bench-press-barbell.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000022', 'Barbell Deadlift', 'barbell-deadlift', 'strength',
   '{hamstrings,glutes,back}', '{core,quads,traps}', '{barbell}', 'intermediate',
   'Bar over mid-foot. Brace, grip the bar, push the floor away and stand tall. Hips and shoulders rise together.',
   '{"Bar stays close to legs","Flat back","Lock out by squeezing glutes"}',
   true, null, 'covers/exercises/barbell-deadlift.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000023', 'Overhead Press (Dumbbell)', 'overhead-press-db', 'strength',
   '{shoulders}', '{triceps,upper_chest}', '{dumbbell}', 'intermediate',
   'Sit or stand tall. Press the dumbbells from your shoulders straight overhead until arms are extended, then lower.',
   '{"Ribs down, no excessive arch","Wrists stacked over elbows","Don''t lock out hard"}',
   false, 'Direct shoulder loading — skip with a sore shoulder. Substitute Landmine Press or Incline Push-Up.',
   'covers/exercises/overhead-press-db.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000024', 'Barbell Row', 'barbell-row', 'strength',
   '{back,lats}', '{biceps,rear_delts}', '{barbell}', 'intermediate',
   'Hinge to ~45°, grip the bar. Row to your lower ribs, squeeze the shoulder blades, then lower with control.',
   '{"Flat back, tall chest","Pull to lower ribs","No torso swing"}',
   true, 'Generally shoulder-safe pulling movement. Keep elbows tucked.',
   'covers/exercises/barbell-row.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000025', 'Hip Thrust (Barbell)', 'hip-thrust-barbell', 'strength',
   '{glutes}', '{hamstrings}', '{barbell,bench}', 'intermediate',
   'Upper back on a bench, bar across your hips. Drive through your heels and squeeze your glutes to lift the bar, pause, lower.',
   '{"Ribs tucked","Full hip extension","Squeeze at the top"}',
   true, null, 'covers/exercises/hip-thrust-barbell.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000026', 'Bulgarian Split Squat', 'bulgarian-split-squat', 'strength',
   '{quads,glutes}', '{hamstrings,core}', '{dumbbell,bench}', 'intermediate',
   'Rear foot on a bench, front foot forward. Lower your back knee toward the floor, then drive through the front heel.',
   '{"Front knee tracks over toes","Torso tall","Full depth on the front leg"}',
   true, null, 'covers/exercises/bulgarian-split-squat.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000027', 'Kettlebell Swing', 'kettlebell-swing', 'conditioning',
   '{glutes,hamstrings}', '{core,shoulders}', '{kettlebell}', 'beginner',
   'Hinge at the hips and swing the kettlebell back between your legs, then snap your hips forward to propel it to chest height.',
   '{"Hinge, don''t squat","Snap the hips","Squeeze glutes at the top"}',
   true, null, 'covers/exercises/kettlebell-swing.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000028', 'Box Jump', 'box-jump', 'power',
   '{quads,glutes,calves}', '{core}', '{bodyweight,box}', 'intermediate',
   'Drop into a quarter squat, then jump onto the box. Land softly with both feet. Step down — never jump down.',
   '{"Land soft and quiet","Full foot on the box","Step down, don''t jump down"}',
   true, null, 'covers/exercises/box-jump.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000029', 'Farmer''s Carry', 'farmers-carry', 'strength',
   '{core,forearms}', '{shoulders,traps}', '{dumbbell,kettlebell}', 'beginner',
   'Hold a heavy weight in each hand. Walk tall with your shoulders back and core braced for distance or time.',
   '{"Tall posture","Shoulders back and down","Even stride"}',
   true, null, 'covers/exercises/farmers-carry.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000002a', 'Push-Up (Flat)', 'push-up-flat', 'strength',
   '{chest}', '{triceps,core,front_delts}', '{bodyweight}', 'beginner',
   'Hands under your shoulders, body in a straight line. Lower your chest to the floor, then press back up.',
   '{"Elbows ~45°","Rigid plank","Full range"}',
   true, 'Generally shoulder-safe. Drop to knees or incline if the shoulder complains.',
   'covers/exercises/push-up-flat.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000002b', 'Pull-Up (Assisted)', 'pull-up-assisted', 'strength',
   '{lats,back}', '{biceps}', '{bodyweight,machine}', 'intermediate',
   'Use a band or assisted machine. Pull your chin above the bar, then lower with control.',
   '{"Pull elbows down","No kipping","Control the descent"}',
   true, 'Overhead pulling can aggravate shoulders. Use neutral grip if available, or substitute Lat Pulldown.',
   'covers/exercises/pull-up-assisted.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000002c', 'Russian Twist', 'russian-twist', 'core',
   '{core,obliques}', '{shoulders}', '{bodyweight}', 'beginner',
   'Sit with knees bent and lean back slightly. Rotate your torso to touch the floor on each side.',
   '{"Controlled rotation","Core engaged","Slow tempo"}',
   true, null, 'covers/exercises/russian-twist.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000002d', 'Mountain Climber', 'mountain-climber', 'conditioning',
   '{core,cardio}', '{shoulders,quads}', '{bodyweight}', 'beginner',
   'In a push-up position, drive one knee toward your chest, then alternate quickly.',
   '{"Hips low","Quick knees","Steady breathing"}',
   true, null, 'covers/exercises/mountain-climber.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000002e', 'Jumping Jack', 'jumping-jack', 'cardio',
   '{cardio}', '{shoulders,legs}', '{bodyweight}', 'beginner',
   'Jump your feet wide while raising your arms overhead, then jump back to the start.',
   '{"Rhythm over speed","Land soft","Stay loose"}',
   true, null, 'covers/exercises/jumping-jack.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000002f', 'Burpee', 'burpee', 'conditioning',
   '{cardio,chest,legs}', '{triceps,core}', '{bodyweight}', 'intermediate',
   'Squat down, kick your feet back to a plank, do a push-up, jump your feet in, then jump up with arms overhead.',
   '{"Move with purpose, not rush","Push-up optional if needed","Land soft from the jump"}',
   true, null, 'covers/exercises/burpee.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000030', 'Stationary Lunge', 'stationary-lunge', 'strength',
   '{quads,glutes}', '{hamstrings,core}', '{dumbbell}', 'beginner',
   'Step forward into a split stance. Lower your back knee toward the floor, then drive through the front heel back to start.',
   '{"Front knee over toes","Torso tall","Control the descent"}',
   true, null, 'covers/exercises/stationary-lunge.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000031', 'Seated Dumbbell Shoulder Press', 'seated-db-shoulder-press', 'strength',
   '{shoulders}', '{triceps}', '{dumbbell,bench}', 'intermediate',
   'Sit on a bench with back support. Press the dumbbells from your shoulders overhead, then lower to the start.',
   '{"Back against the pad","Ribs down","Full range without locking out"}',
   false, 'Overhead pressing — skip with a sore shoulder. Substitute Landmine Press.',
   'covers/exercises/seated-db-shoulder-press.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000032', 'Jump Rope', 'jump-rope', 'cardio',
   '{cardio,calves}', '{shoulders}', '{jump_rope}', 'beginner',
   'Light bounces on the balls of your feet, turning the rope with your wrists.',
   '{"Low jumps","Wrists turn the rope","Stay relaxed"}',
   true, null, 'covers/exercises/jump-rope.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000033', 'Bear Crawl', 'bear-crawl', 'functional',
   '{core,shoulders,quads}', '{core}', '{bodyweight}', 'beginner',
   'On hands and feet with knees hovering. Move opposite hand and foot forward, then repeat.',
   '{"Knees hover off the floor","Slow and controlled","Hips low and level"}',
   true, null, 'covers/exercises/bear-crawl.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000034', 'Thruster (Dumbbell)', 'thruster-db', 'functional',
   '{quads,glutes,shoulders}', '{triceps,core}', '{dumbbell}', 'intermediate',
   'Hold dumbbells at your shoulders. Squat down, then drive up and press the dumbbells overhead in one fluid movement.',
   '{"Full squat depth","Press as you stand","Core tight throughout"}',
   false, 'Combines a squat with an overhead press — skip or lighten with a sore shoulder.',
   'covers/exercises/thruster-db.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000035', 'Kettlebell Snatch', 'kettlebell-snatch', 'power',
   '{glutes,shoulders,back}', '{hamstrings,triceps}', '{kettlebell}', 'advanced',
   'Swing the kettlebell back, then hike it upward in one motion, catching it locked out overhead.',
   '{"One fluid motion","Lock out overhead","Punch through at the top"}',
   false, 'Overhead catch loads the shoulder. Skip with a sore shoulder.',
   'covers/exercises/kettlebell-snatch.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000036', 'Med Ball Slam', 'med-ball-slam', 'power',
   '{core,back}', '{shoulders}', '{medicine_ball}', 'beginner',
   'Raise a medicine ball overhead, then slam it into the floor as hard as possible. Catch the bounce and repeat.',
   '{"Full extension overhead","Slam with intent","Core drives the movement"}',
   true, 'Overhead reach is gentle but the slam is explosive. Keep range pain-free.',
   'covers/exercises/med-ball-slam.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000037', 'Broad Jump', 'broad-jump', 'power',
   '{quads,glutes,hamstrings}', '{calves}', '{bodyweight}', 'intermediate',
   'Drop into a quarter squat, then jump forward as far as you can. Land softly in a squat position.',
   '{"Swing arms back then forward","Land soft in a squat","Reset between reps"}',
   true, null, 'covers/exercises/broad-jump.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000038', 'Pendlay Row', 'pendlay-row', 'strength',
   '{back,lats}', '{biceps,rear_delts}', '{barbell}', 'intermediate',
   'Bar on the floor between reps. Hinge over, pull the bar to your chest explosively, then lower it back to the floor.',
   '{"Dead-stop each rep","Explosive pull","Flat back"}',
   true, null, 'covers/exercises/pendlay-row.jpg', 'published'),

  ('e0000000-0000-4000-8000-000000000039', 'Renegade Row', 'renegade-row', 'functional',
   '{back,core}', '{triceps,shoulders}', '{dumbbell}', 'intermediate',
   'In a push-up position with dumbbells in your hands. Row one dumbbell to your hip while stabilising with the other arm.',
   '{"Hips square","No rotation","Stabilise through the plank"}',
   true, null, 'covers/exercises/renegade-row.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000003a', 'Skater Hop', 'skater-hop', 'conditioning',
   '{glutes,quads,cardio}', '{calves}', '{bodyweight}', 'beginner',
   'Leap laterally onto one foot, stick the landing, then leap back to the other side.',
   '{"Stick the landing","Soft knees","Reach across with each leap"}',
   true, null, 'covers/exercises/skater-hop.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000003b', 'Dumbbell Front Squat', 'db-front-squat', 'strength',
   '{quads,glutes}', '{core,upper_back}', '{dumbbell}', 'intermediate',
   'Hold dumbbells at your shoulders. Squat down keeping your chest tall, then drive back up.',
   '{"Elbows high","Chest tall","Deep as mobility allows"}',
   true, null, 'covers/exercises/db-front-squat.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000003c', 'RKC Plank', 'rkc-plank', 'core',
   '{core}', '{glutes,shoulders}', '{bodyweight}', 'beginner',
   'Forearm plank position. Squeeze everything — glutes, abs, thighs, fists — as hard as possible for a short hold.',
   '{"Maximal tension","Squeeze everything","Short but intense"}',
   true, 'If forearm support bothers the shoulder, do from hands or an incline.',
   'covers/exercises/rkc-plank.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000003d', 'Turkish Get-Up (Partial)', 'turkish-get-up-partial', 'mobility',
   '{core,shoulders}', '{glutes,obliques}', '{kettlebell}', 'intermediate',
   'Lie holding a kettlebell overhead. Roll to your side, come to your elbow, then to your hand, then to a kneeling position. Reverse.',
   '{"Arm locked out overhead","Eyes on the weight","Slow and deliberate"}',
   false, 'Long time under tension overhead. Skip or lighten with a sore shoulder.',
   'covers/exercises/turkish-get-up-partial.jpg', 'published'),

  ('e0000000-0000-4000-8000-00000000003e', 'Hip Flexor Stretch (Kneeling)', 'hip-flexor-stretch-kneeling', 'mobility',
   '{hip_flexors}', '{quads}', '{bodyweight}', 'beginner',
   'Kneel on one knee. Tuck your pelvis under and lean forward into the front leg to stretch the hip flexor of the back leg.',
   '{"Tuck the pelvis","Squeeze the back glute","Gentle lean forward"}',
   true, null, 'covers/exercises/hip-flexor-stretch-kneeling.jpg', 'published')
on conflict (slug) do nothing;

-- ============================================================
-- Exercise alternatives for new exercises
-- ============================================================
insert into public.exercise_alternatives (exercise_id, alternative_exercise_id, reason, priority) values
  ('e0000000-0000-4000-8000-000000000021', 'e0000000-0000-4000-8000-000000000006', 'Machine press offers a controlled path', 1),
  ('e0000000-0000-4000-8000-000000000021', 'e0000000-0000-4000-8000-000000000007', 'Shoulder-friendly pressing option', 2),
  ('e0000000-0000-4000-8000-000000000023', 'e0000000-0000-4000-8000-00000000000e', 'Landmine arc is gentler on the shoulder', 1),
  ('e0000000-0000-4000-8000-000000000023', 'e0000000-0000-4000-8000-000000000007', 'Incline push-up removes overhead arc', 2),
  ('e0000000-0000-4000-8000-000000000031', 'e0000000-0000-4000-8000-00000000000e', 'Landmine press substitute', 1),
  ('e0000000-0000-4000-8000-000000000020', 'e0000000-0000-4000-8000-000000000001', 'Dumbbell alternative for beginners', 1),
  ('e0000000-0000-4000-8000-000000000020', 'e0000000-0000-4000-8000-000000000002', 'Machine option', 2),
  ('e0000000-0000-4000-8000-000000000034', 'e0000000-0000-4000-8000-000000000001', 'Removes the overhead press component', 1),
  ('e0000000-0000-4000-8000-000000000035', 'e0000000-0000-4000-8000-000000000027', 'Removes overhead catch', 1),
  ('e0000000-0000-4000-8000-00000000002b', 'e0000000-0000-4000-8000-000000000005', 'Pulldown allows controlled load', 1),
  ('e0000000-0000-4000-8000-00000000003d', 'e0000000-0000-4000-8000-00000000000a', 'Core work without overhead loading', 1),
  ('e0000000-0000-4000-8000-00000000003b', 'e0000000-0000-4000-8000-000000000001', 'Lighter, beginner-friendly alternative', 1),
  ('e0000000-0000-4000-8000-00000000002a', 'e0000000-0000-4000-8000-000000000007', 'Incline is gentler on the shoulder', 1),
  ('e0000000-0000-4000-8000-000000000031', 'e0000000-0000-4000-8000-000000000007', 'Incline push-up substitute', 2)
on conflict (exercise_id, alternative_exercise_id) do nothing;

-- ============================================================
-- Programs
-- ============================================================
insert into public.programs
  (id, fitness_goal_id, name, slug, short_description, description, cover_image_path,
   experience_level, scheduling_mode, duration_weeks, minimum_days_per_week, maximum_days_per_week,
   estimated_session_minutes, equipment_requirements, difficulty, status, featured, safety_notes, published_at, version)
values
  -- 5. Powerlifting Prep
  ('b0000000-0000-4000-8000-000000000005',
   'd0000000-0000-4000-8000-000000000006',
   'Powerlifting Prep', 'powerlifting-prep',
   'A 12-week squat-bench-deadlift progression for your first meet or PR day.',
   'Twelve weeks of structured squat, bench, and deadlift training. Three main lifts per week with accessory work to build the muscle and stability that carries over to the platform. Linear progression with a built-in deload every fourth week.',
   'covers/programs/powerlifting-prep.jpg',
   'intermediate', 'weekly_split', 12, 3, 4, 75,
   '{barbell,machine,cable}', 'intermediate', 'published', false,
   'Heavy compound lifts — ensure a spotter for bench press. Substitute barbell bench with dumbbell or machine press if shoulder pain exceeds 2/10.',
   now(), 1),

  -- 6. Functional Fitness 8-Week
  ('b0000000-0000-4000-8000-000000000006',
   'd0000000-0000-4000-8000-000000000007',
   'Functional Fitness 8-Week', 'functional-fitness-8-week',
   '8 weeks of mixed-modality training for real-world strength and capacity.',
   'A blend of strength circuits, kettlebell work, carries, and short conditioning finishers. Each session builds movement quality and work capacity that translates beyond the gym. Three sessions per week with an optional fourth mobility day.',
   'covers/programs/functional-fitness-8-week.jpg',
   'beginner', 'sequential', 8, 3, 4, 50,
   '{dumbbell,kettlebell,cable,bodyweight}', 'beginner', 'published', false,
   'Includes explosive movements — start with light weights and master form before adding load. Box jumps: always step down.',
   now(), 1),

  -- 7. Mobility Daily
  ('b0000000-0000-4000-8000-000000000007',
   'd0000000-0000-4000-8000-000000000009',
   'Mobility Daily', 'mobility-daily',
   'A 4-week daily mobility routine to improve range of motion and joint health.',
   'Short, focused mobility sessions you can do every day. Each day targets a different area — hips, shoulders, spine, ankles — with a weekly full-body flow. Perfect as a standalone program or a recovery complement to strength training.',
   'covers/programs/mobility-daily.jpg',
   'all', 'calendar', 4, 3, 7, 20,
   '{bodyweight}', 'beginner', 'published', false,
   'All movements should be pain-free. Never force a stretch — gentle, consistent pressure works best.',
   now(), 1),

  -- 8. Hybrid Athlete
  ('b0000000-0000-4000-8000-000000000008',
   'd0000000-0000-4000-8000-00000000000a',
   'Hybrid Athlete', 'hybrid-athlete',
   'A 12-week concurrent training program for strength and endurance.',
   'Lift and run in the same week without one wrecking the other. Four sessions: two strength days and two conditioning days, plus an optional easy run. The program progressively increases both lifting load and running distance across 12 weeks.',
   'covers/programs/hybrid-athlete.jpg',
   'intermediate', 'weekly_split', 12, 4, 5, 60,
   '{barbell,dumbbell,kettlebell,bodyweight}', 'intermediate', 'published', false,
   'Concurrent training demands recovery. Eat enough, sleep enough, and don''t skip the easy-pace days — they build the aerobic base.',
   now(), 1),

  -- 9. Body Recomp 12-Week
  ('b0000000-0000-4000-8000-000000000009',
   'd0000000-0000-4000-8000-00000000000b',
   'Body Recomp 12-Week', 'body-recomp-12-week',
   '12 weeks of strength-first training with conditioning to recomp at maintenance calories.',
   'Strength training is the priority — three full-body sessions protect and build muscle while careful conditioning manages energy balance. Pairs with a high-protein diet at maintenance calories and optional Mounjaro-assisted weight management tracking.',
   'covers/programs/body-recomp-12-week.jpg',
   'beginner', 'sequential', 12, 3, 4, 50,
   '{dumbbell,machine,cable,bodyweight}', 'beginner', 'published', false,
   'Pairs best with a high-protein diet at maintenance calories. Use the medication tracking feature if on Mounjaro. Keep conditioning low-impact.',
   now(), 1),

  -- 10. Core Crusher 4-Week
  ('b0000000-0000-4000-8000-00000000000a',
   'd0000000-0000-4000-8000-000000000003',
   'Core Crusher 4-Week', 'core-crusher-4-week',
   'A focused 4-week core program to build a stronger, more stable midsection.',
   'Short, targeted core sessions that complement any other training. Anti-extension, anti-rotation, and rotational work across three sessions per week. No sit-ups — smart core training that builds real stability.',
   'covers/programs/core-crusher-4-week.jpg',
   'all', 'sequential', 4, 3, 4, 20,
   '{bodyweight}', 'beginner', 'published', false,
   'Core training should not cause back pain. If any movement causes sharp pain, stop and substitute.',
   now(), 1),

  -- 11. Glute & Lower Body 8-Week
  ('b0000000-0000-4000-8000-00000000000b',
   'd0000000-0000-4000-8000-000000000004',
   'Glute & Lower Body 8-Week', 'glute-lower-body-8-week',
   '8 weeks of targeted lower-body training for stronger glutes and legs.',
   'A hip-dominant program with three sessions per week: one squat-focused, one hinge-focused, and one accessory day. Progressive overload on hip thrusts, squats, and RDLs with glute isolation finishers.',
   'covers/programs/glute-lower-body-8-week.jpg',
   'beginner', 'sequential', 8, 3, 4, 50,
   '{dumbbell,barbell,machine,bench}', 'beginner', 'published', false,
   null, now(), 1),

  -- 12. Express Strength 30-Minute
  ('b0000000-0000-4000-8000-00000000000c',
   'd0000000-0000-4000-8000-000000000003',
   'Express Strength 30-Minute', 'express-strength-30-min',
   'Short, effective 30-minute full-body strength sessions for busy people.',
   'Two alternating full-body sessions designed to be done in 30 minutes. Compound movements only, minimal rest, maximum return. Perfect for maintaining strength when time is tight. Two to three sessions per week.',
   'covers/programs/express-strength-30-min.jpg',
   'beginner', 'sequential', 6, 2, 3, 30,
   '{dumbbell,machine,cable,bodyweight}', 'beginner', 'published', false,
   'Time-efficient — keep rest short and transitions tight. Every exercise has a shoulder-safe sub.',
   now(), 1),

  -- 13. Push Pull Legs Plus
  ('b0000000-0000-4000-8000-00000000000d',
   'd0000000-0000-4000-8000-000000000005',
   'Push Pull Legs Plus', 'push-pull-legs-plus',
   'An advanced 12-week PPL split with elevated volume and intensity techniques.',
   'A six-day push/pull/legs program for experienced lifters. Drop sets, supersets, and progressive overload across a 12-week mesocycle with deload weeks. Maximum hypertrophy volume within recoverable limits.',
   'covers/programs/push-pull-legs-plus.jpg',
   'advanced', 'weekly_split', 12, 4, 6, 75,
   '{barbell,dumbbell,machine,cable,bench}', 'advanced', 'published', false,
   'High volume — do not add extra sessions. If recovery falters, drop one set from every exercise before reducing frequency. Keep 1–2 reps in reserve.',
   now(), 1)
on conflict (slug) do nothing;

-- ============================================================
-- Program weeks
-- ============================================================

-- Powerlifting Prep (12 weeks)
insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-000000000005', 1,  'Base 1', 'Establish working weights', false, 'RPE 7. Find your starting loads.'),
  ('b0000000-0000-4000-8000-000000000005', 2,  'Base 2', 'Small jumps on all lifts', false, null),
  ('b0000000-0000-4000-8000-000000000005', 3,  'Base 3', 'Top of base block', false, 'RPE 8. Add weight where form allows.'),
  ('b0000000-0000-4000-8000-000000000005', 4,  'Deload', 'Recover and reset', true, 'Drop ~15% on all lifts.'),
  ('b0000000-0000-4000-8000-000000000005', 5,  'Build 1', 'Heavier working sets', false, 'RPE 8. Push the main lifts.'),
  ('b0000000-0000-4000-8000-000000000005', 6,  'Build 2', 'Continue progression', false, null),
  ('b0000000-0000-4000-8000-000000000005', 7,  'Build 3', 'Peak of build block', false, 'RPE 9 on top set.'),
  ('b0000000-0000-4000-8000-000000000005', 8,  'Deload', 'Recover before peak', true, 'Drop ~15%.'),
  ('b0000000-0000-4000-8000-000000000005', 9,  'Peak 1', 'Heavy singles and doubles', false, 'RPE 9. Trust the process.'),
  ('b0000000-0000-4000-8000-000000000005', 10, 'Peak 2', 'Top weight this block', false, null),
  ('b0000000-0000-4000-8000-000000000005', 11, 'Peak 3', 'Openers and PR attempts', false, 'RPE 9-10. Plan your openers.'),
  ('b0000000-0000-4000-8000-000000000005', 12, 'Taper & Test', 'Rest then test max', false, 'Light sessions early in the week, test max at the end.')
on conflict (program_id, week_number) do nothing;

-- Functional Fitness (8 weeks)
insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-000000000006', 1, 'Foundation', 'Learn the movements', false, 'Focus on quality. Light weights.'),
  ('b0000000-0000-4000-8000-000000000006', 2, 'Build', 'Add load and speed', false, null),
  ('b0000000-0000-4000-8000-000000000006', 3, 'Build', 'Continue progression', false, null),
  ('b0000000-0000-4000-8000-000000000006', 4, 'Deload', 'Lighter week', true, 'Reduce all weights ~20%.'),
  ('b0000000-0000-4000-8000-000000000006', 5, 'Push', 'Increase intensity', false, null),
  ('b0000000-0000-4000-8000-000000000006', 6, 'Push', 'Top effort', false, null),
  ('b0000000-0000-4000-8000-000000000006', 7, 'Test', 'Challenge yourself', false, 'Go heavier on the strength pieces.'),
  ('b0000000-0000-4000-8000-000000000006', 8, 'Consolidation', 'Solidify gains', false, 'Reflect on 8 weeks of progress.')
on conflict (program_id, week_number) do nothing;

-- Mobility Daily (4 weeks — no week structure needed, calendar-based)
insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-000000000007', 1, 'Week 1', 'Hips & spine focus', false, null),
  ('b0000000-0000-4000-8000-000000000007', 2, 'Week 2', 'Shoulders & upper back', false, null),
  ('b0000000-0000-4000-8000-000000000007', 3, 'Week 3', 'Ankles & full body', false, null),
  ('b0000000-0000-4000-8000-000000000007', 4, 'Week 4', 'Integration', false, 'Full-body flows combining all areas.')
on conflict (program_id, week_number) do nothing;

-- Hybrid Athlete (12 weeks)
insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-000000000008', 1,  'Base 1', 'Establish strength + run base', false, 'Easy pace on all runs.'),
  ('b0000000-0000-4000-8000-000000000008', 2,  'Base 2', 'Build both modalities', false, null),
  ('b0000000-0000-4000-8000-000000000008', 3,  'Base 3', 'Top of base', false, null),
  ('b0000000-0000-4000-8000-000000000008', 4,  'Deload', 'Recover', true, 'Lighter lifts, shorter runs.'),
  ('b0000000-0000-4000-8000-000000000008', 5,  'Build 1', 'Increase lifting load + run distance', false, null),
  ('b0000000-0000-4000-8000-000000000008', 6,  'Build 2', 'Continue progression', false, null),
  ('b0000000-0000-4000-8000-000000000008', 7,  'Build 3', 'Peak build block', false, null),
  ('b0000000-0000-4000-8000-000000000008', 8,  'Deload', 'Recover before peak', true, null),
  ('b0000000-0000-4000-8000-000000000008', 9,  'Peak 1', 'Heaviest lifts, longest runs', false, null),
  ('b0000000-0000-4000-8000-000000000008', 10, 'Peak 2', 'Continue peak', false, null),
  ('b0000000-0000-4000-8000-000000000008', 11, 'Peak 3', 'Top of the program', false, null),
  ('b0000000-0000-4000-8000-000000000008', 12, 'Taper', 'Reduce volume, maintain intensity', false, 'Keep lifts heavy but fewer sets. Easy runs.')
on conflict (program_id, week_number) do nothing;

-- Body Recomp (12 weeks)
insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-000000000009', 1,  'Foundation 1', 'Learn movements, easy weights', false, 'RPE 6-7. Focus on form.'),
  ('b0000000-0000-4000-8000-000000000009', 2,  'Foundation 2', 'Add small load', false, null),
  ('b0000000-0000-4000-8000-000000000009', 3,  'Foundation 3', 'Continue building', false, null),
  ('b0000000-0000-4000-8000-000000000009', 4,  'Deload', 'Recovery week', true, 'Drop ~20%. Keep conditioning light.'),
  ('b0000000-0000-4000-8000-000000000009', 5,  'Build 1', 'Progressive overload', false, 'Add reps then weight.'),
  ('b0000000-0000-4000-8000-000000000009', 6,  'Build 2', 'Nudge loads up', false, null),
  ('b0000000-0000-4000-8000-000000000009', 7,  'Build 3', 'Top of build block', false, null),
  ('b0000000-0000-4000-8000-000000000009', 8,  'Deload', 'Recover', true, 'Reassess body metrics.'),
  ('b0000000-0000-4000-8000-000000000009', 9,  'Strength 1', 'Heavier, lower reps', false, null),
  ('b0000000-0000-4000-8000-000000000009', 10, 'Strength 2', 'Continue progression', false, null),
  ('b0000000-0000-4000-8000-000000000009', 11, 'Strength 3', 'Best working weights', false, null),
  ('b0000000-0000-4000-8000-000000000009', 12, 'Consolidation', 'Lock in progress', false, 'Log body metrics for comparison.')
on conflict (program_id, week_number) do nothing;

-- Core Crusher (4 weeks)
insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-00000000000a', 1, 'Anti-Extension', 'Plank and dead bug progressions', false, null),
  ('b0000000-0000-4000-8000-00000000000a', 2, 'Anti-Rotation', 'Pallof press and side plank work', false, null),
  ('b0000000-0000-4000-8000-00000000000a', 3, 'Rotational', 'Russian twists and dynamic core', false, null),
  ('b0000000-0000-4000-8000-00000000000a', 4, 'Integration', 'Full-body core stability', false, 'Combine all patterns.')
on conflict (program_id, week_number) do nothing;

-- Glute & Lower Body (8 weeks)
insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-00000000000b', 1, 'Foundation', 'Learn the hip hinge and squat patterns', false, null),
  ('b0000000-0000-4000-8000-00000000000b', 2, 'Build', 'Add load to hip thrusts and squats', false, null),
  ('b0000000-0000-4000-8000-00000000000b', 3, 'Build', 'Continue progression', false, null),
  ('b0000000-0000-4000-8000-00000000000b', 4, 'Deload', 'Lighter week', true, 'Drop ~20%.'),
  ('b0000000-0000-4000-8000-00000000000b', 5, 'Push', 'Heavier loads', false, null),
  ('b0000000-0000-4000-8000-00000000000b', 6, 'Push', 'Top effort', false, null),
  ('b0000000-0000-4000-8000-00000000000b', 7, 'Peak', 'Challenge weights', false, null),
  ('b0000000-0000-4000-8000-00000000000b', 8, 'Consolidation', 'Lock in gains', false, null)
on conflict (program_id, week_number) do nothing;

-- Express Strength (6 weeks)
insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-00000000000c', 1, 'Week 1', 'Establish weights', false, 'Pick weights you can hit for all sets.'),
  ('b0000000-0000-4000-8000-00000000000c', 2, 'Week 2', 'Add a rep or load', false, null),
  ('b0000000-0000-4000-8000-00000000000c', 3, 'Week 3', 'Continue progression', false, null),
  ('b0000000-0000-4000-8000-00000000000c', 4, 'Deload', 'Lighter week', true, 'Drop ~20%.'),
  ('b0000000-0000-4000-8000-00000000000c', 5, 'Push', 'Heavier weights', false, null),
  ('b0000000-0000-4000-8000-00000000000c', 6, 'Finish', 'Best weights of the program', false, null)
on conflict (program_id, week_number) do nothing;

-- Push Pull Legs Plus (12 weeks)
insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-00000000000d', 1,  'Mesocycle 1 — Volume', 'High volume, moderate intensity', false, 'RPE 7-8.'),
  ('b0000000-0000-4000-8000-00000000000d', 2,  'Mesocycle 1 — Volume', 'Continue volume', false, null),
  ('b0000000-0000-4000-8000-00000000000d', 3,  'Mesocycle 1 — Volume', 'Top of volume block', false, null),
  ('b0000000-0000-4000-8000-00000000000d', 4,  'Deload', 'Recover', true, 'Drop to 50% volume.'),
  ('b0000000-0000-4000-8000-00000000000d', 5,  'Mesocycle 2 — Intensity', 'Increase load, moderate volume', false, 'RPE 8-9.'),
  ('b0000000-0000-4000-8000-00000000000d', 6,  'Mesocycle 2 — Intensity', 'Continue intensity', false, null),
  ('b0000000-0000-4000-8000-00000000000d', 7,  'Mesocycle 2 — Intensity', 'Top of intensity block', false, null),
  ('b0000000-0000-4000-8000-00000000000d', 8,  'Deload', 'Recover', true, null),
  ('b0000000-0000-4000-8000-00000000000d', 9,  'Mesocycle 3 — Peak', 'Heaviest weights, lowest reps', false, 'RPE 9.'),
  ('b0000000-0000-4000-8000-00000000000d', 10, 'Mesocycle 3 — Peak', 'Continue peak', false, null),
  ('b0000000-0000-4000-8000-00000000000d', 11, 'Mesocycle 3 — Peak', 'Top of program', false, null),
  ('b0000000-0000-4000-8000-00000000000d', 12, 'Deload & Test', 'Recover then test', false, 'Light start, test at the end.')
on conflict (program_id, week_number) do nothing;

-- ============================================================
-- Workout templates
-- ============================================================
insert into public.workout_templates
  (id, program_id, name, slug, category, description, cover_image_path,
   sequence_order, week_position, day_of_week, estimated_minutes, difficulty,
   target_muscle_groups, is_optional, workout_type)
values
  -- Program 5: Powerlifting Prep (weekly_split, 3 days)
  ('c0000000-0000-4000-8000-000000000041', 'b0000000-0000-4000-8000-000000000005',
   'Squat Day', 'squat-day', 'strength',
   'Squat focus with accessory back and core work.',
   'covers/workouts/squat-day.jpg', null, 1, null, 75, 'intermediate',
   '{quads,glutes,back,core}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000042', 'b0000000-0000-4000-8000-000000000005',
   'Bench Day', 'bench-day', 'strength',
   'Bench press focus with shoulder and triceps accessories.',
   'covers/workouts/bench-day.jpg', null, 2, null, 75, 'intermediate',
   '{chest,shoulders,triceps,back}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000043', 'b0000000-0000-4000-8000-000000000005',
   'Deadlift Day', 'deadlift-day', 'strength',
   'Deadlift focus with hamstring and back accessories.',
   'covers/workouts/deadlift-day.jpg', null, 3, null, 75, 'intermediate',
   '{hamstrings,glutes,back,core}', false, 'strength'),

  -- Program 6: Functional Fitness (sequential, 3 + optional)
  ('c0000000-0000-4000-8000-000000000051', 'b0000000-0000-4000-8000-000000000006',
   'Strength & Carry', 'strength-carry', 'full_body',
   'Full-body strength with loaded carries and a conditioning finisher.',
   'covers/workouts/strength-carry.jpg', 1, null, null, 50, 'beginner',
   '{legs,back,core,cardio}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000052', 'b0000000-0000-4000-8000-000000000006',
   'Kettlebell Power', 'kettlebell-power', 'full_body',
   'Kettlebell-focused session with swings, cleans, and core work.',
   'covers/workouts/kettlebell-power.jpg', 2, null, null, 50, 'beginner',
   '{glutes,shoulders,core,cardio}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000053', 'b0000000-0000-4000-8000-000000000006',
   'Conditioning Circuit', 'conditioning-circuit', 'full_body',
   'Bodyweight and dumbbell circuit for work capacity.',
   'covers/workouts/conditioning-circuit.jpg', 3, null, null, 50, 'beginner',
   '{cardio,core,legs}', false, 'conditioning'),
  ('c0000000-0000-4000-8000-000000000054', 'b0000000-0000-4000-8000-000000000006',
   'Mobility Recovery', 'mobility-recovery', 'recovery',
   'Optional 20-minute mobility flow for active recovery.',
   'covers/workouts/mobility-recovery.jpg', null, null, null, 20, 'beginner',
   '{shoulders,hips,spine}', true, 'mobility'),

  -- Program 7: Mobility Daily (calendar, 7 days)
  ('c0000000-0000-4000-8000-000000000061', 'b0000000-0000-4000-8000-000000000007',
   'Hip Mobility', 'hip-mobility', 'mobility',
   '20-minute hip opener flow — hip flexors, adductors, and external rotation.',
   'covers/workouts/hip-mobility.jpg', null, null, 1, 20, 'beginner',
   '{hips,hip_flexors}', false, 'mobility'),
  ('c0000000-0000-4000-8000-000000000062', 'b0000000-0000-4000-8000-000000000007',
   'Shoulder Mobility', 'shoulder-mobility', 'mobility',
   '20-minute shoulder flow — wall slides, thoracic rotation, and gentle ranges.',
   'covers/workouts/shoulder-mobility.jpg', null, null, 2, 20, 'beginner',
   '{shoulders,upper_back}', false, 'mobility'),
  ('c0000000-0000-4000-8000-000000000063', 'b0000000-0000-4000-8000-000000000007',
   'Spine Mobility', 'spine-mobility', 'mobility',
   '20-minute spine flow — cat-cow, thread the needle, and gentle twists.',
   'covers/workouts/spine-mobility.jpg', null, null, 3, 20, 'beginner',
   '{spine,upper_back}', false, 'mobility'),
  ('c0000000-0000-4000-8000-000000000064', 'b0000000-0000-4000-8000-000000000007',
   'Ankle & Calf', 'ankle-calf-mobility', 'mobility',
   '20-minute ankle and calf flow for foot and lower-leg health.',
   'covers/workouts/ankle-calf-mobility.jpg', null, null, 4, 20, 'beginner',
   '{calves,ankles}', false, 'mobility'),
  ('c0000000-0000-4000-8000-000000000065', 'b0000000-0000-4000-8000-000000000007',
   'Full-Body Flow', 'full-body-mobility-flow', 'mobility',
   '30-minute full-body mobility flow combining all areas.',
   'covers/workouts/full-body-mobility-flow.jpg', null, null, 5, 30, 'beginner',
   '{shoulders,hips,spine}', false, 'mobility'),
  ('c0000000-0000-4000-8000-000000000066', 'b0000000-0000-4000-8000-000000000007',
   'Rest & Breathe', 'rest-breathe', 'recovery',
   'Optional rest day with 10 minutes of deep breathing and gentle stretching.',
   'covers/workouts/rest-breathe.jpg', null, null, 6, 10, 'beginner',
   '{}', true, 'recovery'),
  ('c0000000-0000-4000-8000-000000000067', 'b0000000-0000-4000-8000-000000000007',
   'Full-Body Flow', 'full-body-mobility-flow-2', 'mobility',
   'Second full-body flow day — longer and deeper.',
   'covers/workouts/full-body-mobility-flow-2.jpg', null, null, 0, 30, 'beginner',
   '{shoulders,hips,spine}', false, 'mobility'),

  -- Program 8: Hybrid Athlete (weekly_split, 4 days + optional)
  ('c0000000-0000-4000-8000-000000000071', 'b0000000-0000-4000-8000-000000000008',
   'Strength Lower', 'strength-lower', 'strength',
   'Squat and deadlift focus for lower-body strength.',
   'covers/workouts/strength-lower.jpg', null, 1, null, 60, 'intermediate',
   '{quads,glutes,hamstrings}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000072', 'b0000000-0000-4000-8000-000000000008',
   'Strength Upper', 'strength-upper', 'strength',
   'Bench, row, and press for upper-body strength.',
   'covers/workouts/strength-upper.jpg', null, 2, null, 60, 'intermediate',
   '{chest,back,shoulders,triceps}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000073', 'b0000000-0000-4000-8000-000000000008',
   'Conditioning Intervals', 'conditioning-intervals', 'conditioning',
   'Interval training — kettlebell swings, burpees, and short rest.',
   'covers/workouts/conditioning-intervals.jpg', null, 3, null, 45, 'intermediate',
   '{cardio,core,glutes}', false, 'conditioning'),
  ('c0000000-0000-4000-8000-000000000074', 'b0000000-0000-4000-8000-000000000008',
   'Easy Run or Walk', 'easy-run-walk', 'cardio',
   '30-45 minute easy-pace run, jog, or brisk walk. Conversational pace.',
   'covers/workouts/easy-run-walk.jpg', null, 4, null, 40, 'beginner',
   '{cardio}', false, 'cardio'),
  ('c0000000-0000-4000-8000-000000000075', 'b0000000-0000-4000-8000-000000000008',
   'Optional Mobility', 'hybrid-mobility', 'mobility',
   'Optional 15-minute mobility session for recovery.',
   'covers/workouts/hybrid-mobility.jpg', null, 5, null, 15, 'beginner',
   '{shoulders,hips}', true, 'mobility'),

  -- Program 9: Body Recomp (sequential, 3 + optional)
  ('c0000000-0000-4000-8000-000000000081', 'b0000000-0000-4000-8000-000000000009',
   'Full Body Strength A', 'recomp-strength-a', 'full_body',
   'Squat, row, and press with conditioning finisher.',
   'covers/workouts/recomp-strength-a.jpg', 1, null, null, 50, 'beginner',
   '{legs,back,chest,core}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000082', 'b0000000-0000-4000-8000-000000000009',
   'Full Body Strength B', 'recomp-strength-b', 'full_body',
   'Hinge, pulldown, and lunge with bike finisher.',
   'covers/workouts/recomp-strength-b.jpg', 2, null, null, 50, 'beginner',
   '{hamstrings,back,legs,core}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000083', 'b0000000-0000-4000-8000-000000000009',
   'Full Body Strength C', 'recomp-strength-c', 'full_body',
   'Front squat, row, and incline press with walk finisher.',
   'covers/workouts/recomp-strength-c.jpg', 3, null, null, 50, 'beginner',
   '{legs,back,chest}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000084', 'b0000000-0000-4000-8000-000000000009',
   'Conditioning Walk', 'recomp-conditioning-walk', 'cardio',
   'Optional 30-45 minute brisk walk. Low impact, high value.',
   'covers/workouts/recomp-conditioning-walk.jpg', null, null, null, 40, 'beginner',
   '{cardio}', true, 'cardio'),

  -- Program 10: Core Crusher (sequential, 3 days)
  ('c0000000-0000-4000-8000-000000000091', 'b0000000-0000-4000-8000-00000000000a',
   'Anti-Extension', 'anti-extension', 'core',
   'Plank and dead bug focus — resist the extension of your spine.',
   'covers/workouts/anti-extension.jpg', 1, null, null, 20, 'beginner',
   '{core}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000092', 'b0000000-0000-4000-8000-00000000000a',
   'Anti-Rotation', 'anti-rotation', 'core',
   'Side plank and Pallof-style work — resist rotation through the spine.',
   'covers/workouts/anti-rotation.jpg', 2, null, null, 20, 'beginner',
   '{core,obliques}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000093', 'b0000000-0000-4000-8000-00000000000a',
   'Rotational & Dynamic', 'rotational-dynamic', 'core',
   'Russian twists, mountain climbers, and dynamic core work.',
   'covers/workouts/rotational-dynamic.jpg', 3, null, null, 20, 'beginner',
   '{core,obliques,cardio}', false, 'conditioning'),
  ('c0000000-0000-4000-8000-000000000094', 'b0000000-0000-4000-8000-00000000000a',
   'Optional Core Finisher', 'core-finisher', 'core',
   'Optional 10-minute core finisher you can bolt onto any other workout.',
   'covers/workouts/core-finisher.jpg', null, null, null, 10, 'beginner',
   '{core}', true, 'strength'),

  -- Program 11: Glute & Lower Body (sequential, 3 days)
  ('c0000000-0000-4000-8000-0000000000a1', 'b0000000-0000-4000-8000-00000000000b',
   'Squat Focus', 'squat-focus', 'legs',
   'Squat-heavy session with quad and glute accessories.',
   'covers/workouts/squat-focus.jpg', 1, null, null, 50, 'beginner',
   '{quads,glutes}', false, 'strength'),
  ('c0000000-0000-4000-8000-0000000000a2', 'b0000000-0000-4000-8000-00000000000b',
   'Hinge Focus', 'hinge-focus', 'legs',
   'Hip-hinge session with RDLs and hip thrusts.',
   'covers/workouts/hinge-focus.jpg', 2, null, null, 50, 'beginner',
   '{hamstrings,glutes}', false, 'strength'),
  ('c0000000-0000-4000-8000-0000000000a3', 'b0000000-0000-4000-8000-00000000000b',
   'Glute Accessory', 'glute-accessory', 'legs',
   'Glute isolation work with bands and bodyweight finishers.',
   'covers/workouts/glute-accessory.jpg', 3, null, null, 50, 'beginner',
   '{glutes,core}', false, 'strength'),
  ('c0000000-0000-4000-8000-0000000000a4', 'b0000000-0000-4000-8000-00000000000b',
   'Optional Mobility', 'glute-mobility', 'recovery',
   'Optional 15-minute hip and glute mobility flow.',
   'covers/workouts/glute-mobility.jpg', null, null, null, 15, 'beginner',
   '{hips,glutes}', true, 'mobility'),

  -- Program 12: Express Strength (sequential, 2 days)
  ('c0000000-0000-4000-8000-0000000000b1', 'b0000000-0000-4000-8000-00000000000c',
   'Express A', 'express-a', 'full_body',
   '30-minute full-body: squat, row, press, core.',
   'covers/workouts/express-a.jpg', 1, null, null, 30, 'beginner',
   '{legs,back,chest,core}', false, 'strength'),
  ('c0000000-0000-4000-8000-0000000000b2', 'b0000000-0000-4000-8000-00000000000c',
   'Express B', 'express-b', 'full_body',
   '30-minute full-body: hinge, pulldown, push-up, core.',
   'covers/workouts/express-b.jpg', 2, null, null, 30, 'beginner',
   '{hamstrings,back,chest,core}', false, 'strength'),

  -- Program 13: Push Pull Legs Plus (weekly_split, 6 days)
  ('c0000000-0000-4000-8000-0000000000c1', 'b0000000-0000-4000-8000-00000000000d',
   'Push A', 'push-a-plus', 'push',
   'Chest, shoulders, triceps — heavy compounds + isolation.',
   'covers/workouts/push-a-plus.jpg', null, 1, null, 75, 'advanced',
   '{chest,shoulders,triceps}', false, 'hypertrophy'),
  ('c0000000-0000-4000-8000-0000000000c2', 'b0000000-0000-4000-8000-00000000000d',
   'Pull A', 'pull-a-plus', 'pull',
   'Back and biceps — width, thickness, and arm isolation.',
   'covers/workouts/pull-a-plus.jpg', null, 2, null, 75, 'advanced',
   '{back,biceps,rear_delts}', false, 'hypertrophy'),
  ('c0000000-0000-4000-8000-0000000000c3', 'b0000000-0000-4000-8000-00000000000d',
   'Legs A', 'legs-a-plus', 'legs',
   'Quads, hamstrings, glutes, and calves — high volume.',
   'covers/workouts/legs-a-plus.jpg', null, 3, null, 75, 'advanced',
   '{quads,hamstrings,glutes,calves}', false, 'hypertrophy'),
  ('c0000000-0000-4000-8000-0000000000c4', 'b0000000-0000-4000-8000-00000000000d',
   'Push B', 'push-b-plus', 'push',
   'Shoulder-focused push with chest accessories.',
   'covers/workouts/push-b-plus.jpg', null, 4, null, 75, 'advanced',
   '{shoulders,chest,triceps}', false, 'hypertrophy'),
  ('c0000000-0000-4000-8000-0000000000c5', 'b0000000-0000-4000-8000-00000000000d',
   'Pull B', 'pull-b-plus', 'pull',
   'Horizontal pull focus with vertical pull accessories.',
   'covers/workouts/pull-b-plus.jpg', null, 5, null, 75, 'advanced',
   '{back,lats,biceps}', false, 'hypertrophy'),
  ('c0000000-0000-4000-8000-0000000000c6', 'b0000000-0000-4000-8000-00000000000d',
   'Legs B', 'legs-b-plus', 'legs',
   'Posterior chain focus — hip thrusts, RDLs, and hamstring curls.',
   'covers/workouts/legs-b-plus.jpg', null, 6, null, 75, 'advanced',
   '{glutes,hamstrings,calves}', false, 'hypertrophy')
on conflict (program_id, slug) do nothing;

-- ============================================================
-- Workout template exercises
-- ============================================================
insert into public.workout_template_exercises
  (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rep_target, rest_seconds, notes, is_optional)
values
  -- Powerlifting Prep: Squat Day
  ('c0000000-0000-4000-8000-000000000041', 'e0000000-0000-4000-8000-000000000020', 1, 4, 3, 5, null, 180, 'Main lift. RPE 7-8.', false),
  ('c0000000-0000-4000-8000-000000000041', 'e0000000-0000-4000-8000-000000000024', 2, 3, 6, 8, null, 120, 'Barbell row for back strength.', false),
  ('c0000000-0000-4000-8000-000000000041', 'e0000000-0000-4000-8000-00000000000f', 3, 3, 8, 10, null, 90, null, false),
  ('c0000000-0000-4000-8000-000000000041', 'e0000000-0000-4000-8000-000000000009', 4, 3, null, null, '30-45s hold', 60, null, false),
  ('c0000000-0000-4000-8000-000000000041', 'e0000000-0000-4000-8000-000000000010', 5, 3, 10, 15, null, 60, null, true),

  -- Powerlifting Prep: Bench Day
  ('c0000000-0000-4000-8000-000000000042', 'e0000000-0000-4000-8000-000000000021', 1, 4, 3, 5, null, 180, 'Main lift. RPE 7-8. Spotter required.', false),
  ('c0000000-0000-4000-8000-000000000042', 'e0000000-0000-4000-8000-000000000005', 2, 3, 8, 10, null, 120, null, false),
  ('c0000000-0000-4000-8000-000000000042', 'e0000000-0000-4000-8000-00000000000d', 3, 3, 12, 15, null, 90, 'Shoulder health work.', false),
  ('c0000000-0000-4000-8000-000000000042', 'e0000000-0000-4000-8000-000000000012', 4, 3, 8, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000042', 'e0000000-0000-4000-8000-00000000000e', 5, 2, 8, 10, null, 90, 'Shoulder-friendly press option.', true),

  -- Powerlifting Prep: Deadlift Day
  ('c0000000-0000-4000-8000-000000000043', 'e0000000-0000-4000-8000-000000000022', 1, 4, 3, 5, null, 180, 'Main lift. RPE 7-8.', false),
  ('c0000000-0000-4000-8000-000000000043', 'e0000000-0000-4000-8000-000000000025', 2, 3, 8, 10, null, 120, 'Hip thrust for glute strength.', false),
  ('c0000000-0000-4000-8000-000000000043', 'e0000000-0000-4000-8000-000000000003', 3, 3, 8, 10, null, 90, null, false),
  ('c0000000-0000-4000-8000-000000000043', 'e0000000-0000-4000-8000-000000000004', 4, 3, 10, 12, null, 90, null, false),
  ('c0000000-0000-4000-8000-000000000043', 'e0000000-0000-4000-8000-00000000000b', 5, 2, 8, 8, null, 60, 'Per side.', false),

  -- Functional Fitness: Strength & Carry
  ('c0000000-0000-4000-8000-000000000051', 'e0000000-0000-4000-8000-000000000001', 1, 3, 8, 10, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000051', 'e0000000-0000-4000-8000-000000000004', 2, 3, 10, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000051', 'e0000000-0000-4000-8000-000000000007', 3, 3, 8, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000051', 'e0000000-0000-4000-8000-000000000029', 4, 3, null, null, '30m carry', 60, 'Heavy carry. Tall posture.', false),
  ('c0000000-0000-4000-8000-000000000051', 'e0000000-0000-4000-8000-00000000002d', 5, 1, null, null, '5 min AMRAP', 0, 'Conditioning finisher.', false),

  -- Functional Fitness: Kettlebell Power
  ('c0000000-0000-4000-8000-000000000052', 'e0000000-0000-4000-8000-000000000027', 1, 4, 12, 15, null, 60, 'Hinge-driven. Snap the hips.', false),
  ('c0000000-0000-4000-8000-000000000052', 'e0000000-0000-4000-8000-000000000003', 2, 3, 8, 10, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000052', 'e0000000-0000-4000-8000-000000000039', 3, 3, 8, 10, null, 75, 'Per side.', false),
  ('c0000000-0000-4000-8000-000000000052', 'e0000000-0000-4000-8000-000000000017', 4, 2, null, null, '30s per side', 45, null, false),
  ('c0000000-0000-4000-8000-000000000052', 'e0000000-0000-4000-8000-000000000036', 5, 3, 8, 10, null, 60, 'Explosive. Full effort each rep.', false),

  -- Functional Fitness: Conditioning Circuit
  ('c0000000-0000-4000-8000-000000000053', 'e0000000-0000-4000-8000-00000000002f', 1, 3, null, null, '45s on / 15s off', 0, '3 rounds of the circuit.', false),
  ('c0000000-0000-4000-8000-000000000053', 'e0000000-0000-4000-8000-00000000002d', 2, 3, null, null, '45s on / 15s off', 0, null, false),
  ('c0000000-0000-4000-8000-000000000053', 'e0000000-0000-4000-8000-00000000003a', 3, 3, null, null, '45s on / 15s off', 0, null, false),
  ('c0000000-0000-4000-8000-000000000053', 'e0000000-0000-4000-8000-00000000002a', 4, 3, null, null, '45s on / 15s off', 0, null, false),
  ('c0000000-0000-4000-8000-000000000053', 'e0000000-0000-4000-8000-00000000000b', 5, 3, null, null, '45s on / 15s off', 0, 'Per side.', false),

  -- Functional Fitness: Mobility Recovery
  ('c0000000-0000-4000-8000-000000000054', 'e0000000-0000-4000-8000-00000000000c', 1, 2, 8, 10, null, 30, null, false),
  ('c0000000-0000-4000-8000-000000000054', 'e0000000-0000-4000-8000-00000000003e', 2, 2, null, null, '30s per side', 30, null, false),
  ('c0000000-0000-4000-8000-000000000054', 'e0000000-0000-4000-8000-00000000000b', 3, 2, 8, 8, null, 30, 'Per side.', false),
  ('c0000000-0000-4000-8000-000000000054', 'e0000000-0000-4000-8000-000000000017', 4, 2, null, null, '20s per side', 30, null, false),

  -- Mobility Daily: Hip Mobility (Monday)
  ('c0000000-0000-4000-8000-000000000061', 'e0000000-0000-4000-8000-00000000003e', 1, 2, null, null, '45s per side', 30, null, false),
  ('c0000000-0000-4000-8000-000000000061', 'e0000000-0000-4000-8000-000000000008', 2, 2, 12, 15, null, 30, 'Glute bridge for hip opener.', false),
  ('c0000000-0000-4000-8000-000000000061', 'e0000000-0000-4000-8000-000000000026', 3, 2, 8, 10, null, 30, 'Per side. Bodyweight only — use for stretch.', false),
  ('c0000000-0000-4000-8000-000000000061', 'e0000000-0000-4000-8000-000000000030', 4, 2, 8, 10, null, 30, 'Per side. Slow tempo for mobility.', false),

  -- Mobility Daily: Shoulder Mobility (Tuesday)
  ('c0000000-0000-4000-8000-000000000062', 'e0000000-0000-4000-8000-00000000000c', 1, 3, 8, 10, null, 30, null, false),
  ('c0000000-0000-4000-8000-000000000062', 'e0000000-0000-4000-8000-00000000000d', 2, 3, 12, 15, null, 30, 'Light. Shoulder health.', false),
  ('c0000000-0000-4000-8000-000000000062', 'e0000000-0000-4000-8000-00000000000b', 3, 2, 8, 8, null, 30, 'Per side. Gentle range.', false),
  ('c0000000-0000-4000-8000-000000000062', 'e0000000-0000-4000-8000-000000000017', 4, 2, null, null, '30s per side', 30, null, false),

  -- Mobility Daily: Spine Mobility (Wednesday)
  ('c0000000-0000-4000-8000-000000000063', 'e0000000-0000-4000-8000-00000000000a', 1, 2, 8, 8, null, 30, 'Per side. Spinal control.', false),
  ('c0000000-0000-4000-8000-000000000063', 'e0000000-0000-4000-8000-00000000000b', 2, 2, 8, 8, null, 30, 'Per side. Gentle rotation.', false),
  ('c0000000-0000-4000-8000-000000000063', 'e0000000-0000-4000-8000-00000000002c', 3, 2, 8, 10, null, 30, 'Controlled rotation.', false),
  ('c0000000-0000-4000-8000-000000000063', 'e0000000-0000-4000-8000-00000000000c', 4, 2, 8, 10, null, 30, 'Wall slide for thoracic extension.', false),

  -- Mobility Daily: Ankle & Calf (Thursday)
  ('c0000000-0000-4000-8000-000000000064', 'e0000000-0000-4000-8000-000000000010', 1, 2, 12, 15, null, 30, 'Slow tempo. Full stretch.', false),
  ('c0000000-0000-4000-8000-000000000064', 'e0000000-0000-4000-8000-000000000030', 2, 2, 8, 10, null, 30, 'Per side. Ankle mobility focus.', false),
  ('c0000000-0000-4000-8000-000000000064', 'e0000000-0000-4000-8000-000000000026', 3, 2, 8, 10, null, 30, 'Per side. Bodyweight, slow tempo.', false),
  ('c0000000-0000-4000-8000-000000000064', 'e0000000-0000-4000-8000-000000000008', 4, 2, 12, 15, null, 30, null, false),

  -- Mobility Daily: Full-Body Flow (Friday)
  ('c0000000-0000-4000-8000-000000000065', 'e0000000-0000-4000-8000-00000000000c', 1, 2, 8, 10, null, 30, null, false),
  ('c0000000-0000-4000-8000-000000000065', 'e0000000-0000-4000-8000-00000000003e', 2, 2, null, null, '30s per side', 30, null, false),
  ('c0000000-0000-4000-8000-000000000065', 'e0000000-0000-4000-8000-00000000000b', 3, 2, 8, 8, null, 30, 'Per side.', false),
  ('c0000000-0000-4000-8000-000000000065', 'e0000000-0000-4000-8000-000000000017', 4, 2, null, null, '30s per side', 30, null, false),
  ('c0000000-0000-4000-8000-000000000065', 'e0000000-0000-4000-8000-000000000010', 5, 2, 10, 12, null, 30, null, false),

  -- Mobility Daily: Rest & Breathe (Saturday)
  ('c0000000-0000-4000-8000-000000000066', 'e0000000-0000-4000-8000-00000000000a', 1, 1, null, null, '5 min deep breathing + gentle stretch', 0, 'Focus on breath. Relax.', false),

  -- Mobility Daily: Full-Body Flow 2 (Sunday)
  ('c0000000-0000-4000-8000-000000000067', 'e0000000-0000-4000-8000-00000000000c', 1, 2, 8, 10, null, 30, null, false),
  ('c0000000-0000-4000-8000-000000000067', 'e0000000-0000-4000-8000-00000000003e', 2, 2, null, null, '30s per side', 30, null, false),
  ('c0000000-0000-4000-8000-000000000067', 'e0000000-0000-4000-8000-000000000017', 3, 2, null, null, '30s per side', 30, null, false),
  ('c0000000-0000-4000-8000-000000000067', 'e0000000-0000-4000-8000-000000000010', 4, 2, 10, 12, null, 30, null, false),

  -- Hybrid Athlete: Strength Lower
  ('c0000000-0000-4000-8000-000000000071', 'e0000000-0000-4000-8000-000000000020', 1, 4, 5, 6, null, 150, 'Heavy squat. RPE 8.', false),
  ('c0000000-0000-4000-8000-000000000071', 'e0000000-0000-4000-8000-000000000022', 2, 3, 5, 6, null, 150, 'RDL or deadlift. RPE 8.', false),
  ('c0000000-0000-4000-8000-000000000071', 'e0000000-0000-4000-8000-000000000026', 3, 3, 8, 10, null, 90, 'Per side.', false),
  ('c0000000-0000-4000-8000-000000000071', 'e0000000-0000-4000-8000-000000000008', 4, 3, 12, 15, null, 60, null, false),

  -- Hybrid Athlete: Strength Upper
  ('c0000000-0000-4000-8000-000000000072', 'e0000000-0000-4000-8000-000000000021', 1, 4, 5, 6, null, 150, 'Bench. RPE 8. Spotter required.', false),
  ('c0000000-0000-4000-8000-000000000072', 'e0000000-0000-4000-8000-000000000024', 2, 3, 6, 8, null, 120, 'Barbell row.', false),
  ('c0000000-0000-4000-8000-000000000072', 'e0000000-0000-4000-8000-00000000000e', 3, 3, 8, 10, null, 90, 'Shoulder-friendly press.', false),
  ('c0000000-0000-4000-8000-000000000072', 'e0000000-0000-4000-8000-000000000012', 4, 3, 8, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000072', 'e0000000-0000-4000-8000-000000000011', 5, 2, 10, 12, null, 60, null, true),

  -- Hybrid Athlete: Conditioning Intervals
  ('c0000000-0000-4000-8000-000000000073', 'e0000000-0000-4000-8000-000000000027', 1, 4, 12, 15, null, 60, 'KB swings. Explosive.', false),
  ('c0000000-0000-4000-8000-000000000073', 'e0000000-0000-4000-8000-00000000002f', 2, 3, null, null, '30s on / 30s off', 0, '5 rounds.', false),
  ('c0000000-0000-4000-8000-000000000073', 'e0000000-0000-4000-8000-00000000002d', 3, 3, null, null, '45s on / 15s off', 0, null, false),
  ('c0000000-0000-4000-8000-000000000073', 'e0000000-0000-4000-8000-00000000003a', 4, 3, null, null, '45s on / 15s off', 0, null, false),

  -- Hybrid Athlete: Easy Run/Walk
  ('c0000000-0000-4000-8000-000000000074', 'e0000000-0000-4000-8000-000000000014', 1, 1, null, null, '30-45 min easy', 0, 'Conversational pace. Zone 2.', false),

  -- Hybrid Athlete: Optional Mobility
  ('c0000000-0000-4000-8000-000000000075', 'e0000000-0000-4000-8000-00000000000c', 1, 2, 8, 10, null, 30, null, false),
  ('c0000000-0000-4000-8000-000000000075', 'e0000000-0000-4000-8000-00000000003e', 2, 2, null, null, '30s per side', 30, null, false),
  ('c0000000-0000-4000-8000-000000000075', 'e0000000-0000-4000-8000-000000000017', 3, 2, null, null, '20s per side', 30, null, false),

  -- Body Recomp: Full Body Strength A
  ('c0000000-0000-4000-8000-000000000081', 'e0000000-0000-4000-8000-000000000001', 1, 3, 8, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000081', 'e0000000-0000-4000-8000-00000000001a', 2, 3, 10, 12, null, 75, 'Per side.', false),
  ('c0000000-0000-4000-8000-000000000081', 'e0000000-0000-4000-8000-000000000007', 3, 3, 8, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000081', 'e0000000-0000-4000-8000-000000000008', 4, 3, 12, 15, null, 60, null, false),
  ('c0000000-0000-4000-8000-000000000081', 'e0000000-0000-4000-8000-000000000013', 5, 1, null, null, '8 min moderate', 0, 'Conditioning finisher.', false),

  -- Body Recomp: Full Body Strength B
  ('c0000000-0000-4000-8000-000000000082', 'e0000000-0000-4000-8000-000000000002', 1, 3, 10, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000082', 'e0000000-0000-4000-8000-000000000005', 2, 3, 10, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000082', 'e0000000-0000-4000-8000-000000000030', 3, 3, 10, 12, null, 75, 'Per side.', false),
  ('c0000000-0000-4000-8000-000000000082', 'e0000000-0000-4000-8000-00000000000a', 4, 2, 8, 8, null, 60, 'Per side.', false),
  ('c0000000-0000-4000-8000-000000000082', 'e0000000-0000-4000-8000-000000000014', 5, 1, null, null, '10 min brisk', 0, null, false),

  -- Body Recomp: Full Body Strength C
  ('c0000000-0000-4000-8000-000000000083', 'e0000000-0000-4000-8000-00000000003b', 1, 3, 8, 10, null, 75, 'DB front squat.', false),
  ('c0000000-0000-4000-8000-000000000083', 'e0000000-0000-4000-8000-000000000004', 2, 3, 10, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000083', 'e0000000-0000-4000-8000-000000000019', 3, 3, 8, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000083', 'e0000000-0000-4000-8000-000000000009', 4, 2, null, null, '30s hold', 45, null, false),
  ('c0000000-0000-4000-8000-000000000083', 'e0000000-0000-4000-8000-000000000014', 5, 1, null, null, '10 min incline', 0, null, false),

  -- Body Recomp: Conditioning Walk
  ('c0000000-0000-4000-8000-000000000084', 'e0000000-0000-4000-8000-000000000014', 1, 1, null, null, '30-45 min brisk', 0, 'Low impact. Log the time.', false),

  -- Core Crusher: Anti-Extension
  ('c0000000-0000-4000-8000-000000000091', 'e0000000-0000-4000-8000-00000000003c', 1, 3, null, null, '15-20s max tension', 45, 'RKC plank. Squeeze everything.', false),
  ('c0000000-0000-4000-8000-000000000091', 'e0000000-0000-4000-8000-000000000009', 2, 3, null, null, '30-45s hold', 45, null, false),
  ('c0000000-0000-4000-8000-000000000091', 'e0000000-0000-4000-8000-00000000000a', 3, 3, 8, 8, null, 45, 'Per side. Slow tempo.', false),
  ('c0000000-0000-4000-8000-000000000091', 'e0000000-0000-4000-8000-00000000000b', 4, 2, 8, 8, null, 45, 'Per side.', false),

  -- Core Crusher: Anti-Rotation
  ('c0000000-0000-4000-8000-000000000092', 'e0000000-0000-4000-8000-000000000017', 1, 3, null, null, '30s per side', 45, null, false),
  ('c0000000-0000-4000-8000-000000000092', 'e0000000-0000-4000-8000-00000000000b', 2, 3, 8, 8, null, 45, 'Bird dog for anti-rotation.', false),
  ('c0000000-0000-4000-8000-000000000092', 'e0000000-0000-4000-8000-000000000009', 3, 2, null, null, '30s hold', 45, 'Side plank. Per side.', false),
  ('c0000000-0000-4000-8000-000000000092', 'e0000000-0000-4000-8000-00000000003c', 4, 2, null, null, '15s hold', 45, 'Short max-tension plank.', false),

  -- Core Crusher: Rotational & Dynamic
  ('c0000000-0000-4000-8000-000000000093', 'e0000000-0000-4000-8000-00000000002c', 1, 3, 12, 15, null, 45, 'Per side.', false),
  ('c0000000-0000-4000-8000-000000000093', 'e0000000-0000-4000-8000-00000000002d', 2, 3, null, null, '30s on / 15s off', 0, null, false),
  ('c0000000-0000-4000-8000-000000000093', 'e0000000-0000-4000-8000-00000000003a', 3, 3, null, null, '30s on / 15s off', 0, null, false),
  ('c0000000-0000-4000-8000-000000000093', 'e0000000-0000-4000-8000-00000000000b', 4, 2, 8, 8, null, 45, 'Per side.', false),

  -- Core Crusher: Optional Finisher
  ('c0000000-0000-4000-8000-000000000094', 'e0000000-0000-4000-8000-000000000009', 1, 2, null, null, '30s hold', 30, null, false),
  ('c0000000-0000-4000-8000-000000000094', 'e0000000-0000-4000-8000-00000000002c', 2, 2, 10, 12, null, 30, 'Per side.', false),
  ('c0000000-0000-4000-8000-000000000094', 'e0000000-0000-4000-8000-00000000000a', 3, 2, 8, 8, null, 30, 'Per side.', false),

  -- Glute & Lower Body: Squat Focus
  ('c0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-000000000001', 1, 4, 8, 10, null, 90, 'Goblet or front squat. Progress load weekly.', false),
  ('c0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-000000000015', 2, 3, 12, 15, null, 60, 'Leg extension.', false),
  ('c0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-000000000026', 3, 3, 10, 12, null, 90, 'Per side.', false),
  ('c0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-000000000010', 4, 3, 12, 15, null, 60, null, false),
  ('c0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-000000000008', 5, 3, 12, 15, null, 60, 'Glute bridge finisher.', false),

  -- Glute & Lower Body: Hinge Focus
  ('c0000000-0000-4000-8000-0000000000a2', 'e0000000-0000-4000-8000-000000000025', 1, 4, 8, 10, null, 90, 'Hip thrust. Progressive overload.', false),
  ('c0000000-0000-4000-8000-0000000000a2', 'e0000000-0000-4000-8000-000000000003', 2, 3, 8, 10, null, 90, 'RDL.', false),
  ('c0000000-0000-4000-8000-0000000000a2', 'e0000000-0000-4000-8000-00000000000f', 3, 3, 10, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-0000000000a2', 'e0000000-0000-4000-8000-00000000001b', 4, 3, 10, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-0000000000a2', 'e0000000-0000-4000-8000-000000000008', 5, 3, 15, 20, null, 45, 'Glute bridge burnout.', false),

  -- Glute & Lower Body: Glute Accessory
  ('c0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-000000000008', 1, 4, 15, 20, null, 45, 'Bodyweight glute bridge. High rep.', false),
  ('c0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-000000000030', 2, 3, 12, 15, null, 60, 'Per side.', false),
  ('c0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-000000000009', 3, 3, null, null, '30s hold', 45, null, false),
  ('c0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-000000000010', 4, 3, 12, 15, null, 60, null, false),
  ('c0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-00000000000b', 5, 2, 8, 8, null, 45, 'Per side. Core finisher.', false),

  -- Glute & Lower Body: Optional Mobility
  ('c0000000-0000-4000-8000-0000000000a4', 'e0000000-0000-4000-8000-00000000003e', 1, 2, null, null, '45s per side', 30, null, false),
  ('c0000000-0000-4000-8000-0000000000a4', 'e0000000-0000-4000-8000-00000000000c', 2, 2, 8, 10, null, 30, null, false),
  ('c0000000-0000-4000-8000-0000000000a4', 'e0000000-0000-4000-8000-000000000017', 3, 2, null, null, '30s per side', 30, null, false),

  -- Express Strength: Express A
  ('c0000000-0000-4000-8000-0000000000b1', 'e0000000-0000-4000-8000-000000000001', 1, 3, 8, 10, null, 60, 'Superset 1A.', false),
  ('c0000000-0000-4000-8000-0000000000b1', 'e0000000-0000-4000-8000-000000000004', 2, 3, 10, 12, null, 60, 'Superset 1B — alternate with squats.', false),
  ('c0000000-0000-4000-8000-0000000000b1', 'e0000000-0000-4000-8000-000000000007', 3, 3, 8, 12, null, 60, 'Superset 2A.', false),
  ('c0000000-0000-4000-8000-0000000000b1', 'e0000000-0000-4000-8000-00000000000a', 4, 2, 8, 8, null, 45, 'Superset 2B. Per side.', false),

  -- Express Strength: Express B
  ('c0000000-0000-4000-8000-0000000000b2', 'e0000000-0000-4000-8000-000000000003', 1, 3, 8, 10, null, 60, 'Superset 1A. RDL.', false),
  ('c0000000-0000-4000-8000-0000000000b2', 'e0000000-0000-4000-8000-000000000005', 2, 3, 10, 12, null, 60, 'Superset 1B. Alternate with RDL.', false),
  ('c0000000-0000-4000-8000-0000000000b2', 'e0000000-0000-4000-8000-00000000002a', 3, 3, 8, 12, null, 60, 'Superset 2A. Push-up.', false),
  ('c0000000-0000-4000-8000-0000000000b2', 'e0000000-0000-4000-8000-00000000000b', 4, 2, 8, 8, null, 45, 'Superset 2B. Per side.', false),

  -- PPL Plus: Push A
  ('c0000000-0000-4000-8000-0000000000c1', 'e0000000-0000-4000-8000-000000000018', 1, 4, 6, 8, null, 120, 'Dumbbell bench press. RPE 8.', false),
  ('c0000000-0000-4000-8000-0000000000c1', 'e0000000-0000-4000-8000-000000000019', 2, 3, 8, 10, null, 90, null, false),
  ('c0000000-0000-4000-8000-0000000000c1', 'e0000000-0000-4000-8000-00000000000e', 3, 3, 8, 10, null, 90, 'Landmine press.', false),
  ('c0000000-0000-4000-8000-0000000000c1', 'e0000000-0000-4000-8000-000000000016', 4, 3, 12, 15, null, 60, 'Light. Stop before pinch.', false),
  ('c0000000-0000-4000-8000-0000000000c1', 'e0000000-0000-4000-8000-000000000012', 5, 3, 10, 12, null, 60, null, false),

  -- PPL Plus: Pull A
  ('c0000000-0000-4000-8000-0000000000c2', 'e0000000-0000-4000-8000-00000000002b', 1, 4, 6, 8, null, 120, 'Assisted pull-up. RPE 8.', false),
  ('c0000000-0000-4000-8000-0000000000c2', 'e0000000-0000-4000-8000-000000000024', 2, 3, 8, 10, null, 90, 'Barbell row.', false),
  ('c0000000-0000-4000-8000-0000000000c2', 'e0000000-0000-4000-8000-00000000000d', 3, 3, 12, 15, null, 60, null, false),
  ('c0000000-0000-4000-8000-0000000000c2', 'e0000000-0000-4000-8000-000000000011', 4, 3, 10, 12, null, 60, null, false),
  ('c0000000-0000-4000-8000-0000000000c2', 'e0000000-0000-4000-8000-00000000001a', 5, 3, 10, 12, null, 60, 'Per side.', false),

  -- PPL Plus: Legs A
  ('c0000000-0000-4000-8000-0000000000c3', 'e0000000-0000-4000-8000-000000000020', 1, 4, 6, 8, null, 120, 'Barbell squat. RPE 8.', false),
  ('c0000000-0000-4000-8000-0000000000c3', 'e0000000-0000-4000-8000-000000000025', 2, 3, 8, 10, null, 90, 'Hip thrust.', false),
  ('c0000000-0000-4000-8000-0000000000c3', 'e0000000-0000-4000-8000-000000000026', 3, 3, 10, 12, null, 90, 'Per side.', false),
  ('c0000000-0000-4000-8000-0000000000c3', 'e0000000-0000-4000-8000-00000000000f', 4, 3, 10, 12, null, 60, null, false),
  ('c0000000-0000-4000-8000-0000000000c3', 'e0000000-0000-4000-8000-000000000010', 5, 4, 12, 15, null, 45, null, false),

  -- PPL Plus: Push B
  ('c0000000-0000-4000-8000-0000000000c4', 'e0000000-0000-4000-8000-000000000031', 1, 4, 6, 8, null, 120, 'Seated DB shoulder press. RPE 8.', false),
  ('c0000000-0000-4000-8000-0000000000c4', 'e0000000-0000-4000-8000-000000000021', 2, 3, 8, 10, null, 90, 'Barbell bench.', false),
  ('c0000000-0000-4000-8000-0000000000c4', 'e0000000-0000-4000-8000-00000000002a', 3, 3, 12, 15, null, 60, 'Push-up.', false),
  ('c0000000-0000-4000-8000-0000000000c4', 'e0000000-0000-4000-8000-000000000012', 4, 3, 10, 12, null, 60, null, false),
  ('c0000000-0000-4000-8000-0000000000c4', 'e0000000-0000-4000-8000-000000000016', 5, 3, 12, 15, null, 60, 'Light lateral raise.', true),

  -- PPL Plus: Pull B
  ('c0000000-0000-4000-8000-0000000000c5', 'e0000000-0000-4000-8000-000000000038', 1, 4, 6, 8, null, 120, 'Pendlay row. RPE 8.', false),
  ('c0000000-0000-4000-8000-0000000000c5', 'e0000000-0000-4000-8000-000000000005', 2, 3, 8, 10, null, 90, 'Lat pulldown.', false),
  ('c0000000-0000-4000-8000-0000000000c5', 'e0000000-0000-4000-8000-000000000004', 3, 3, 10, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-0000000000c5', 'e0000000-0000-4000-8000-00000000000d', 4, 3, 12, 15, null, 60, null, false),
  ('c0000000-0000-4000-8000-0000000000c5', 'e0000000-0000-4000-8000-000000000011', 5, 3, 10, 12, null, 60, null, false),

  -- PPL Plus: Legs B
  ('c0000000-0000-4000-8000-0000000000c6', 'e0000000-0000-4000-8000-000000000025', 1, 4, 6, 8, null, 120, 'Hip thrust. RPE 8.', false),
  ('c0000000-0000-4000-8000-0000000000c6', 'e0000000-0000-4000-8000-000000000003', 2, 3, 8, 10, null, 90, 'RDL.', false),
  ('c0000000-0000-4000-8000-0000000000c6', 'e0000000-0000-4000-8000-000000000002', 3, 3, 10, 12, null, 90, 'Leg press.', false),
  ('c0000000-0000-4000-8000-0000000000c6', 'e0000000-0000-4000-8000-00000000000f', 4, 3, 10, 12, null, 60, null, false),
  ('c0000000-0000-4000-8000-0000000000c6', 'e0000000-0000-4000-8000-000000000010', 5, 4, 12, 15, null, 45, null, false)
on conflict (workout_template_id, position) do nothing;

-- ============================================================
-- Placeholder cover-image media assets for new programs
-- ============================================================
insert into public.media_assets (storage_bucket, storage_path, media_type, alt_text, status)
select 'media', p.cover_image_path, 'image',
       p.name || ' cover image (placeholder — upload via Admin > Media)', 'draft'
from public.programs p
where p.cover_image_path is not null
  and p.id in (
    'b0000000-0000-4000-8000-000000000005',
    'b0000000-0000-4000-8000-000000000006',
    'b0000000-0000-4000-8000-000000000007',
    'b0000000-0000-4000-8000-000000000008',
    'b0000000-0000-4000-8000-000000000009',
    'b0000000-0000-4000-8000-00000000000a',
    'b0000000-0000-4000-8000-00000000000b',
    'b0000000-0000-4000-8000-00000000000c',
    'b0000000-0000-4000-8000-00000000000d'
  )
on conflict (storage_bucket, storage_path) do nothing;

-- Placeholder cover images for new workout templates
insert into public.media_assets (storage_bucket, storage_path, media_type, alt_text, status)
select 'media', w.cover_image_path, 'image',
       w.name || ' workout cover image (placeholder — upload via Admin > Media)', 'draft'
from public.workout_templates w
where w.cover_image_path is not null
  and w.program_id in (
    'b0000000-0000-4000-8000-000000000005',
    'b0000000-0000-4000-8000-000000000006',
    'b0000000-0000-4000-8000-000000000007',
    'b0000000-0000-4000-8000-000000000008',
    'b0000000-0000-4000-8000-000000000009',
    'b0000000-0000-4000-8000-00000000000a',
    'b0000000-0000-4000-8000-00000000000b',
    'b0000000-0000-4000-8000-00000000000c',
    'b0000000-0000-4000-8000-00000000000d'
  )
on conflict (storage_bucket, storage_path) do nothing;

-- Placeholder cover images for new exercises
insert into public.media_assets (storage_bucket, storage_path, media_type, alt_text, status)
select 'media', e.cover_image_path, 'image',
       e.name || ' exercise cover image (placeholder — upload via Admin > Media)', 'draft'
from public.exercises e
where e.cover_image_path is not null
  and e.id >= 'e0000000-0000-4000-8000-000000000020'
  and e.id <= 'e0000000-0000-4000-8000-00000000003e'
on conflict (storage_bucket, storage_path) do nothing;

-- ============================================================
-- Placeholder exercise videos for new exercises
-- ============================================================
insert into public.exercise_videos
  (exercise_id, provider, source_url, provider_video_id, embed_url, thumbnail_url,
   title, creator_name, verification_status, admin_notes, active)
select
  e.id,
  'youtube',
  'https://www.youtube.com/results?search_query=' || replace(e.name, ' ', '+') || '+tutorial+form',
  null, null, null,
  e.name || ' — technique tutorial (placeholder)',
  null,
  'placeholder',
  'PLACEHOLDER — replace with a verified YouTube video via Admin > Videos before presenting as guidance.',
  true
from public.exercises e
where e.id >= 'e0000000-0000-4000-8000-000000000020'
  and e.id <= 'e0000000-0000-4000-8000-00000000003e'
on conflict do nothing;

-- ============================================================
-- Featured content for new programs
-- ============================================================
insert into public.featured_content
  (placement, content_type, content_id, image_path, headline, subheading,
   call_to_action_label, call_to_action_href, display_order, active)
values
  ('dashboard_discover', 'program', 'b0000000-0000-4000-8000-000000000005',
   'covers/programs/powerlifting-prep.jpg',
   'Strength on the big three.',
   'Powerlifting Prep — 12 weeks of structured squat, bench, and deadlift training.',
   'View Program', '/programs/powerlifting-prep', 3, true),
  ('dashboard_discover', 'program', 'b0000000-0000-4000-8000-000000000006',
   'covers/programs/functional-fitness-8-week.jpg',
   'Train for the real world.',
   'Functional Fitness 8-Week — kettlebells, carries, and conditioning that translates.',
   'View Program', '/programs/functional-fitness-8-week', 4, true),
  ('dashboard_discover', 'program', 'b0000000-0000-4000-8000-000000000008',
   'covers/programs/hybrid-athlete.jpg',
   'Lift and run. Both.',
   'Hybrid Athlete — 12 weeks of concurrent strength and endurance training.',
   'View Program', '/programs/hybrid-athlete', 5, true),
  ('dashboard_discover', 'program', 'b0000000-0000-4000-8000-00000000000c',
   'covers/programs/express-strength-30-min.jpg',
   'No time? No problem.',
   'Express Strength — 30-minute full-body sessions for busy people.',
   'View Program', '/programs/express-strength-30-min', 6, true)
on conflict do nothing;
