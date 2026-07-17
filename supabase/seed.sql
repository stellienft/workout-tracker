-- Stellio Fit — seed data
-- Idempotent-ish: uses fixed UUIDs + ON CONFLICT DO NOTHING.
-- Placeholder cover images and YouTube links are clearly flagged
-- (media status 'draft', video verification_status 'placeholder')
-- and surfaced as such in the admin area.

-- ============================================================
-- Roles
-- ============================================================
insert into public.roles (id, key, name, description) values
  ('a0000000-0000-4000-8000-000000000001', 'user', 'User', 'Standard member account'),
  ('a0000000-0000-4000-8000-000000000002', 'admin', 'Administrator', 'Can manage system content'),
  ('a0000000-0000-4000-8000-000000000003', 'super_admin', 'Super Administrator', 'Full platform control, including roles')
on conflict (key) do nothing;

-- ============================================================
-- Fitness goals
-- ============================================================
insert into public.fitness_goals
  (id, name, slug, short_description, long_description, cover_image_path,
   recommended_experience_levels, recommended_frequency_min, recommended_frequency_max,
   typical_session_minutes, display_order, active)
values
  ('d0000000-0000-4000-8000-000000000001', 'Beginner Strength', 'beginner-strength',
   'Build a strong, confident foundation.',
   'A structured introduction to strength training. Learn the key movement patterns, build full-body strength, and develop a sustainable gym habit — two to three short sessions a week.',
   'covers/goals/beginner-strength.jpg', '{beginner}', 2, 3, 45, 1, true),
  ('d0000000-0000-4000-8000-000000000002', 'Fat Loss', 'fat-loss',
   'Lose fat while keeping your strength.',
   'Combine strength work with low-impact conditioning to protect muscle while losing fat. Designed to pair well with a modest calorie deficit and daily walking.',
   'covers/goals/fat-loss.jpg', '{beginner,intermediate}', 3, 4, 45, 2, true),
  ('d0000000-0000-4000-8000-000000000003', 'General Fitness', 'general-fitness',
   'Feel fitter, move better, live well.',
   'Balanced full-body training that mixes strength, mobility and cardiovascular fitness. The all-rounder option when you want to feel good rather than chase a single number.',
   'covers/goals/general-fitness.jpg', '{beginner,intermediate}', 2, 3, 40, 3, true),
  ('d0000000-0000-4000-8000-000000000004', 'Muscle Gain', 'muscle-gain',
   'Add lean muscle with progressive overload.',
   'Hypertrophy-focused training with enough volume and progression to grow, without living in the gym. Best paired with a small calorie surplus and consistent sleep.',
   'covers/goals/muscle-gain.jpg', '{beginner,intermediate}', 3, 5, 60, 4, true),
  ('d0000000-0000-4000-8000-000000000005', 'Bodybuilding', 'bodybuilding',
   'Sculpt balanced, complete physique development.',
   'Classic bodybuilding-style training: push/pull/legs and upper/lower splits, controlled tempo, and balanced development across every muscle group. Clean programming — no ego lifting.',
   'covers/goals/bodybuilding.jpg', '{beginner,intermediate,advanced}', 3, 6, 60, 5, true),
  ('d0000000-0000-4000-8000-000000000006', 'Powerlifting', 'powerlifting',
   'Get strong on the big three lifts.',
   'Squat, bench and deadlift focused strength training with structured progression. Programs for this goal are being expanded — check back soon.',
   'covers/goals/powerlifting.jpg', '{intermediate,advanced}', 3, 4, 75, 6, true),
  ('d0000000-0000-4000-8000-000000000007', 'Functional Fitness', 'functional-fitness',
   'Train for real-world strength and capacity.',
   'Mixed-modality training that builds strength, conditioning and coordination you can use outside the gym.',
   'covers/goals/functional-fitness.jpg', '{beginner,intermediate}', 3, 5, 50, 7, true),
  ('d0000000-0000-4000-8000-000000000008', 'Athletic Performance', 'athletic-performance',
   'Faster, springier, more powerful.',
   'Speed, power and strength work for sport. Programs for this goal are being expanded — check back soon.',
   'covers/goals/athletic-performance.jpg', '{intermediate,advanced}', 3, 5, 60, 8, true),
  ('d0000000-0000-4000-8000-000000000009', 'Mobility', 'mobility',
   'Move freely, without stiffness or pain.',
   'Dedicated mobility and control work to improve range of motion, joint health and recovery.',
   'covers/goals/mobility.jpg', '{beginner,intermediate,advanced}', 2, 7, 25, 9, true),
  ('d0000000-0000-4000-8000-00000000000a', 'Hybrid Training', 'hybrid-training',
   'Strength and endurance, together.',
   'Concurrent training for people who want to lift and run (or ride, or row) in the same week without one wrecking the other.',
   'covers/goals/hybrid-training.jpg', '{intermediate,advanced}', 4, 6, 60, 10, true),
  ('d0000000-0000-4000-8000-00000000000b', 'Body Recomposition', 'body-recomposition',
   'Lose fat and build muscle at the same time.',
   'Strength-first training with careful conditioning, ideal alongside a high-protein diet at maintenance calories. Great fit if you are also using medication-assisted weight management.',
   'covers/goals/body-recomposition.jpg', '{beginner,intermediate}', 3, 4, 50, 11, true)
on conflict (slug) do nothing;

-- ============================================================
-- Exercises
-- ============================================================
insert into public.exercises
  (id, name, slug, category, primary_muscles, secondary_muscles, equipment, difficulty,
   instructions, technique_cues, shoulder_safe, shoulder_notes, cover_image_path, status)
values
  ('e0000000-0000-4000-8000-000000000001', 'Goblet Squat', 'goblet-squat', 'strength',
   '{quads,glutes}', '{core}', '{dumbbell}', 'beginner',
   'Hold a dumbbell at your chest, feet shoulder-width. Sit down between your heels, keeping your chest tall, then stand back up.',
   '{"Elbows inside knees at the bottom","Heels stay down","Chest up, eyes forward"}',
   true, null, 'covers/exercises/goblet-squat.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000002', 'Leg Press', 'leg-press', 'strength',
   '{quads,glutes}', '{hamstrings}', '{machine}', 'beginner',
   'Set feet shoulder-width on the platform. Lower under control until knees reach ~90°, then press back without locking out hard.',
   '{"Lower back stays on the pad","Knees track over toes","Control the lowering"}',
   true, null, 'covers/exercises/leg-press.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000003', 'Dumbbell Romanian Deadlift', 'romanian-deadlift-db', 'strength',
   '{hamstrings,glutes}', '{lower_back,core}', '{dumbbell}', 'beginner',
   'Soft knees, hinge at the hips and slide the dumbbells down your thighs until you feel a hamstring stretch, then drive hips forward to stand.',
   '{"Hips back, not knees forward","Flat back throughout","Dumbbells stay close to legs"}',
   true, null, 'covers/exercises/romanian-deadlift-db.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000004', 'Seated Cable Row', 'seated-cable-row', 'strength',
   '{back,lats}', '{biceps,rear_delts}', '{cable}', 'beginner',
   'Sit tall, pull the handle to your lower ribs, squeeze the shoulder blades together, then let the arms lengthen under control.',
   '{"Shoulders down away from ears","Lead with the elbows","No torso swing"}',
   true, 'Generally shoulder-friendly. Keep elbows close to the body and stop short of any pinch.', 'covers/exercises/seated-cable-row.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000005', 'Lat Pulldown (Neutral Grip)', 'lat-pulldown-neutral', 'strength',
   '{lats,back}', '{biceps}', '{cable,machine}', 'beginner',
   'Use a neutral-grip attachment. Pull the bar to your upper chest while keeping your torso tall, then control it back up.',
   '{"Pull elbows to hips","Chest proud","No yanking"}',
   true, 'Neutral grip is usually the most shoulder-friendly pulldown. Avoid behind-the-neck variations entirely.', 'covers/exercises/lat-pulldown-neutral.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000006', 'Machine Chest Press', 'machine-chest-press', 'strength',
   '{chest}', '{triceps,front_delts}', '{machine}', 'beginner',
   'Set the seat so handles sit at mid-chest. Press forward without fully locking out, then return under control.',
   '{"Shoulder blades set back and down","Stop before any shoulder pinch","Smooth tempo"}',
   false, 'Use caution with a sore left shoulder: limit range to pain-free, keep elbows ~45°, and substitute Incline Push-Up or Landmine Press if pain exceeds 2/10.', 'covers/exercises/machine-chest-press.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000007', 'Incline Push-Up', 'incline-push-up', 'strength',
   '{chest}', '{triceps,core}', '{bodyweight,bench}', 'beginner',
   'Hands on a bench or bar, body in a straight line. Lower your chest to the edge, then press away.',
   '{"Body rigid like a plank","Elbows ~45° from torso","Full control both directions"}',
   true, 'A shoulder-friendly pressing option — the higher the incline, the easier and gentler it is.', 'covers/exercises/incline-push-up.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000008', 'Glute Bridge', 'glute-bridge', 'strength',
   '{glutes}', '{hamstrings,core}', '{bodyweight}', 'beginner',
   'Lie on your back, knees bent. Drive through your heels and squeeze your glutes to lift your hips, pause, then lower.',
   '{"Ribs down, no back arch","Squeeze at the top","Slow lowering"}',
   true, null, 'covers/exercises/glute-bridge.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000009', 'Plank', 'plank', 'core',
   '{core}', '{shoulders,glutes}', '{bodyweight}', 'beginner',
   'Forearms on the floor, body in a straight line from head to heels. Breathe and hold.',
   '{"Squeeze glutes","Push floor away","Don''t let hips sag"}',
   true, 'If forearm support bothers the shoulder, raise hands to a bench (incline plank).', 'covers/exercises/plank.jpg', 'published'),
  ('e0000000-0000-4000-8000-00000000000a', 'Dead Bug', 'dead-bug', 'core',
   '{core}', '{}', '{bodyweight}', 'beginner',
   'On your back, arms up and knees at 90°. Lower opposite arm and leg toward the floor while keeping your lower back pressed down.',
   '{"Lower back glued to floor","Move slowly","Exhale as you extend"}',
   true, null, 'covers/exercises/dead-bug.jpg', 'published'),
  ('e0000000-0000-4000-8000-00000000000b', 'Bird Dog', 'bird-dog', 'core',
   '{core,lower_back}', '{glutes}', '{bodyweight}', 'beginner',
   'On hands and knees, reach one arm and the opposite leg out until parallel with the floor. Pause, return, and switch sides.',
   '{"Hips stay level","Reach long, not high","Slow and controlled"}',
   true, null, 'covers/exercises/bird-dog.jpg', 'published'),
  ('e0000000-0000-4000-8000-00000000000c', 'Wall Slide', 'wall-slide', 'mobility',
   '{shoulders,upper_back}', '{}', '{bodyweight}', 'beginner',
   'Back against a wall, forearms on the wall in a goalpost shape. Slide arms up as far as comfortable, then back down.',
   '{"Ribs down","Only go as far as pain-free","Forearms stay in contact"}',
   true, 'Excellent gentle shoulder rehab drill. Stay strictly within the pain-free range.', 'covers/exercises/wall-slide.jpg', 'published'),
  ('e0000000-0000-4000-8000-00000000000d', 'Face Pull', 'face-pull', 'strength',
   '{rear_delts,upper_back}', '{rotator_cuff}', '{cable}', 'beginner',
   'Set a rope at face height. Pull it toward your eyes while spreading the rope ends, elbows high and wide.',
   '{"Light weight, high control","Squeeze shoulder blades","Pause at the face"}',
   true, 'Great for shoulder health at light loads. Stop if it provokes the sore shoulder.', 'covers/exercises/face-pull.jpg', 'published'),
  ('e0000000-0000-4000-8000-00000000000e', 'Landmine Press', 'landmine-press', 'strength',
   '{shoulders,chest}', '{triceps,core}', '{barbell,landmine}', 'beginner',
   'Hold the end of a landmine barbell at your shoulder and press up and forward along its arc.',
   '{"Press along the bar''s arc","Ribs down","Stop short of discomfort"}',
   false, 'A shoulder-friendlier alternative to overhead pressing, but still a press — keep loads light and the range pain-free.', 'covers/exercises/landmine-press.jpg', 'published'),
  ('e0000000-0000-4000-8000-00000000000f', 'Seated Hamstring Curl', 'hamstring-curl', 'strength',
   '{hamstrings}', '{}', '{machine}', 'beginner',
   'Adjust the pad above your heels. Curl your heels down and under, pause, then return under control.',
   '{"Full comfortable range","Pause at the squeeze","No jerking"}',
   true, null, 'covers/exercises/hamstring-curl.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000010', 'Standing Calf Raise', 'standing-calf-raise', 'strength',
   '{calves}', '{}', '{bodyweight,machine}', 'beginner',
   'Rise up onto the balls of your feet as high as possible, pause, then lower your heels below the step.',
   '{"Pause at the top","Deep stretch at the bottom","Slow tempo"}',
   true, null, 'covers/exercises/standing-calf-raise.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000011', 'Dumbbell Curl', 'dumbbell-curl', 'strength',
   '{biceps}', '{forearms}', '{dumbbell}', 'beginner',
   'Curl the dumbbells up while keeping your elbows pinned to your sides, then lower with control.',
   '{"No swinging","Full lowering","Squeeze at the top"}',
   true, null, 'covers/exercises/dumbbell-curl.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000012', 'Triceps Pushdown', 'triceps-pushdown', 'strength',
   '{triceps}', '{}', '{cable}', 'beginner',
   'Elbows pinned to your sides, press the attachment down until your arms are straight, then return under control.',
   '{"Elbows stay still","Full extension","Controlled return"}',
   true, null, 'covers/exercises/triceps-pushdown.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000013', 'Stationary Bike', 'stationary-bike', 'cardio',
   '{quads,cardio}', '{}', '{machine}', 'beginner',
   'Ride at a comfortable, conversational pace. Adjust the seat so your knee keeps a slight bend at the bottom of the stroke.',
   '{"Conversational pace","Smooth cadence","Relax the shoulders"}',
   true, null, 'covers/exercises/stationary-bike.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000014', 'Treadmill Walk', 'treadmill-walk', 'cardio',
   '{cardio,legs}', '{}', '{machine}', 'beginner',
   'Walk briskly, optionally on a slight incline. You should be able to talk but feel warm.',
   '{"Tall posture","Natural arm swing","Slight incline optional"}',
   true, null, 'covers/exercises/treadmill-walk.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000015', 'Leg Extension', 'leg-extension', 'strength',
   '{quads}', '{}', '{machine}', 'beginner',
   'Extend your knees until your legs are straight, pause briefly, then lower under control.',
   '{"Pause at the top","No kicking","Adjust pad to ankle"}',
   true, null, 'covers/exercises/leg-extension.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000016', 'Lateral Raise (Light)', 'lateral-raise-light', 'strength',
   '{side_delts}', '{}', '{dumbbell}', 'intermediate',
   'With light dumbbells, raise your arms out to the side to about shoulder height, then lower slowly.',
   '{"Light weight only","Lead with elbows","Stop below any pinch point"}',
   false, 'Loads the shoulder directly. Skip or keep very light and strictly pain-free with a sore shoulder; Face Pull is the recommended substitute.', 'covers/exercises/lateral-raise-light.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000017', 'Side Plank', 'side-plank', 'core',
   '{core,obliques}', '{shoulders}', '{bodyweight}', 'beginner',
   'On your forearm and the side of your foot, lift your hips into a straight line and hold.',
   '{"Stack shoulders and hips","Push the floor away","Breathe"}',
   true, 'Support on the non-sore side, or do from knees if forearm support bothers the shoulder.', 'covers/exercises/side-plank.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000018', 'Dumbbell Bench Press', 'dumbbell-bench-press', 'strength',
   '{chest}', '{triceps,front_delts}', '{dumbbell,bench}', 'intermediate',
   'Lying on a bench, press the dumbbells up over your chest, then lower until your elbows reach a comfortable depth.',
   '{"Shoulder blades tucked","Elbows ~45°","Don''t chase depth"}',
   false, 'Adjustable range makes this more forgiving than a barbell, but it still loads the shoulder — keep range pain-free.', 'covers/exercises/dumbbell-bench-press.jpg', 'published'),
  ('e0000000-0000-4000-8000-000000000019', 'Incline Dumbbell Press', 'incline-dumbbell-press', 'strength',
   '{upper_chest}', '{triceps,front_delts}', '{dumbbell,bench}', 'intermediate',
   'On a 30° incline bench, press the dumbbells up and slightly back, lowering to a comfortable stretch.',
   '{"Modest incline (~30°)","Wrists stacked over elbows","Controlled lowering"}',
   false, 'Same caution as other presses with a sore shoulder — pain-free range only.', 'covers/exercises/incline-dumbbell-press.jpg', 'published'),
  ('e0000000-0000-4000-8000-00000000001a', 'One-Arm Dumbbell Row', 'one-arm-dumbbell-row', 'strength',
   '{back,lats}', '{biceps,core}', '{dumbbell,bench}', 'beginner',
   'One hand and knee on a bench, row the dumbbell to your hip, then lower with a long arm.',
   '{"Row to the hip, not the armpit","Square hips","No torso rotation"}',
   true, 'Supported rows are usually well tolerated. Keep the elbow close to the body.', 'covers/exercises/one-arm-dumbbell-row.jpg', 'published'),
  ('e0000000-0000-4000-8000-00000000001b', 'Walking Lunge', 'walking-lunge', 'strength',
   '{quads,glutes}', '{hamstrings,core}', '{bodyweight,dumbbell}', 'intermediate',
   'Step forward and lower your back knee toward the floor, then drive through the front heel into the next step.',
   '{"Long enough stride","Torso tall","Knee tracks over toes"}',
   true, null, 'covers/exercises/walking-lunge.jpg', 'published')
on conflict (slug) do nothing;

-- ============================================================
-- Exercise alternatives (substitutions, incl. shoulder-safe swaps)
-- ============================================================
insert into public.exercise_alternatives (exercise_id, alternative_exercise_id, reason, priority) values
  ('e0000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000007', 'Shoulder-friendly pressing option with adjustable difficulty', 1),
  ('e0000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-00000000000e', 'Pressing arc that is often better tolerated by sore shoulders', 2),
  ('e0000000-0000-4000-8000-000000000018', 'e0000000-0000-4000-8000-000000000007', 'Shoulder-friendly pressing option', 1),
  ('e0000000-0000-4000-8000-000000000018', 'e0000000-0000-4000-8000-000000000006', 'Machine offers a fixed, controllable path', 2),
  ('e0000000-0000-4000-8000-000000000019', 'e0000000-0000-4000-8000-000000000007', 'Shoulder-friendly pressing option', 1),
  ('e0000000-0000-4000-8000-00000000000e', 'e0000000-0000-4000-8000-000000000007', 'Removes overhead arc entirely', 1),
  ('e0000000-0000-4000-8000-000000000016', 'e0000000-0000-4000-8000-00000000000d', 'Trains shoulder health without direct lateral loading', 1),
  ('e0000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000004', 'Horizontal pull if vertical pulling aggravates the shoulder', 1),
  ('e0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-00000000001a', 'Dumbbell option when cables are busy', 1),
  ('e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'Machine option that removes the need to hold a weight', 1),
  ('e0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'Free-weight option when the machine is busy', 1),
  ('e0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-00000000000f', 'Machine hamstring option', 1),
  ('e0000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-00000000000a', 'Core work with zero shoulder loading', 1),
  ('e0000000-0000-4000-8000-00000000001b', 'e0000000-0000-4000-8000-000000000002', 'Lower-skill leg option', 1)
on conflict (exercise_id, alternative_exercise_id) do nothing;

-- ============================================================
-- Exercise videos — PLACEHOLDERS.
-- verification_status 'placeholder' + admin note so the admin
-- area clearly shows these need a real, verified YouTube link.
-- The app falls back to written instructions + a YouTube search
-- link until a verified video is attached.
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
on conflict do nothing;

-- ============================================================
-- Programs
-- ============================================================

-- 1. Beginner Strength Foundations — the complete detailed program
insert into public.programs
  (id, fitness_goal_id, name, slug, short_description, description, cover_image_path,
   experience_level, scheduling_mode, duration_weeks, minimum_days_per_week, maximum_days_per_week,
   estimated_session_minutes, equipment_requirements, difficulty, status, featured, safety_notes, published_at, version)
values
  ('b0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001',
   'Beginner Strength Foundations', 'beginner-strength-foundations',
   'A 12-week, 2–3 day full-body introduction to strength training.',
   'Twelve weeks of flexible A/B full-body training built for real life. Alternate Full Body A and Full Body B in whatever order your week allows — miss a session and the sequence simply continues, nothing breaks. An optional Recovery C session keeps you moving on easy days. Every pressing movement has a shoulder-safe substitute built in, and the program adapts around a sore left shoulder.',
   'covers/programs/beginner-strength-foundations.jpg',
   'beginner', 'sequential', 12, 2, 3, 45,
   '{dumbbell,machine,cable,bodyweight}', 'beginner', 'published', true,
   'Built to adapt around a sore left shoulder: pressing volume is conservative, every press has a pain-free substitute, and the pre-workout check-in adjusts the session when shoulder pain is elevated. Stop any set that exceeds 2/10 shoulder pain and use the suggested substitute.',
   now(), 1),

-- 2. Bodybuilding Foundations — weekly split
  ('b0000000-0000-4000-8000-000000000002',
   'd0000000-0000-4000-8000-000000000005',
   'Bodybuilding Foundations', 'bodybuilding-foundations',
   'A 12-week push/pull/legs split for balanced muscle development.',
   'Twelve weeks of classic hypertrophy training across a three-day push/pull/legs split. Controlled tempo, moderate rep ranges and steady progressive overload — leave one or two reps in reserve on every set. No maximal singles, no routine training to failure.',
   'covers/programs/bodybuilding-foundations.jpg',
   'beginner', 'weekly_split', 12, 3, 4, 60,
   '{dumbbell,machine,cable,bench}', 'intermediate', 'published', true,
   'Keep 1–2 reps in reserve on all working sets. Do not chase failure or maximal loads; progression comes from small weekly increases.',
   now(), 1),

-- 3. Fat Loss and Strength
  ('b0000000-0000-4000-8000-000000000003',
   'd0000000-0000-4000-8000-000000000002',
   'Fat Loss and Strength', 'fat-loss-and-strength',
   'A 10-week mix of strength work and low-impact conditioning.',
   'Ten weeks of alternating strength circuits plus optional walking sessions. The strength work protects your muscle while you lose fat; the conditioning keeps daily energy expenditure up without beating up your joints.',
   'covers/programs/fat-loss-and-strength.jpg',
   'beginner', 'sequential', 10, 3, 4, 45,
   '{dumbbell,machine,cable,bodyweight}', 'beginner', 'published', false,
   'Pairs best with a modest calorie deficit and a daily step goal. Keep conditioning low-impact.',
   now(), 1),

-- 4. General Fitness
  ('b0000000-0000-4000-8000-000000000004',
   'd0000000-0000-4000-8000-000000000003',
   'General Fitness', 'general-fitness-8-week',
   'An 8-week blend of full-body strength, mobility and cardio.',
   'Eight weeks of balanced training: two full-body strength sessions plus an optional mobility and cardio day. The goal is to feel stronger, move better and build the habit.',
   'covers/programs/general-fitness.jpg',
   'all', 'sequential', 8, 2, 3, 40,
   '{dumbbell,machine,cable,bodyweight}', 'beginner', 'published', false,
   null, now(), 1)
on conflict (slug) do nothing;

-- ============================================================
-- Program weeks — Beginner Strength Foundations (12 weeks)
-- ============================================================
insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-000000000001', 1,  'Foundation 1', 'Learn the movements at easy weights', false, 'Effort ~RPE 6. Focus entirely on technique.'),
  ('b0000000-0000-4000-8000-000000000001', 2,  'Foundation 2', 'Groove technique, add a little load', false, null),
  ('b0000000-0000-4000-8000-000000000001', 3,  'Foundation 3', 'Small load increases where form is solid', false, null),
  ('b0000000-0000-4000-8000-000000000001', 4,  'Reset Week', 'Deload — lighter weights, same movements', true, 'Drop weights ~20%. Perfect reps only.'),
  ('b0000000-0000-4000-8000-000000000001', 5,  'Build 1', 'Progressive overload begins', false, 'Add reps first, then weight.'),
  ('b0000000-0000-4000-8000-000000000001', 6,  'Build 2', 'Keep nudging reps and load', false, null),
  ('b0000000-0000-4000-8000-000000000001', 7,  'Build 3', 'Top of the first build block', false, null),
  ('b0000000-0000-4000-8000-000000000001', 8,  'Reset Week', 'Deload before the final block', true, 'Drop weights ~20%. Recheck shoulder status.'),
  ('b0000000-0000-4000-8000-000000000001', 9,  'Strength 1', 'Slightly heavier, lower-rep sets', false, null),
  ('b0000000-0000-4000-8000-000000000001', 10, 'Strength 2', 'Continue steady progression', false, null),
  ('b0000000-0000-4000-8000-000000000001', 11, 'Strength 3', 'Best working weights of the block', false, null),
  ('b0000000-0000-4000-8000-000000000001', 12, 'Consolidation', 'Comfortable weights, celebrate progress', false, 'Log your 12-week strength comparison in Progress.')
on conflict (program_id, week_number) do nothing;

-- ============================================================
-- Workout templates
-- ============================================================
insert into public.workout_templates
  (id, program_id, name, slug, category, description, cover_image_path,
   sequence_order, week_position, day_of_week, estimated_minutes, difficulty,
   target_muscle_groups, is_optional, workout_type)
values
  -- Beginner: flexible A/B sequential + optional recovery
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'Full Body A', 'full-body-a', 'full_body',
   'Squat-focused full-body session with horizontal pulling and shoulder-safe pressing.',
   'covers/workouts/full-body-a.jpg', 1, null, null, 45, 'beginner',
   '{legs,back,chest,core}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001',
   'Full Body B', 'full-body-b', 'full_body',
   'Hinge-focused full-body session with vertical pulling and incline pressing.',
   'covers/workouts/full-body-b.jpg', 2, null, null, 45, 'beginner',
   '{hamstrings,glutes,back,core}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001',
   'Recovery C', 'recovery-c', 'recovery',
   'Optional easy session: gentle cardio, core control and shoulder-friendly mobility.',
   'covers/workouts/recovery-c.jpg', null, null, null, 30, 'beginner',
   '{core,shoulders,cardio}', true, 'recovery'),

  -- Bodybuilding Foundations: 3-day weekly split
  ('c0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000002',
   'Push Day', 'push-day', 'push',
   'Chest, shoulders and triceps with controlled tempo and reps in reserve.',
   'covers/workouts/push-day.jpg', null, 1, null, 60, 'intermediate',
   '{chest,shoulders,triceps}', false, 'hypertrophy'),
  ('c0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000002',
   'Pull Day', 'pull-day', 'pull',
   'Back, rear delts and biceps — width, thickness and posture.',
   'covers/workouts/pull-day.jpg', null, 2, null, 60, 'intermediate',
   '{back,rear_delts,biceps}', false, 'hypertrophy'),
  ('c0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000002',
   'Leg Day', 'leg-day', 'legs',
   'Quads, hamstrings, glutes and calves with balanced volume.',
   'covers/workouts/leg-day.jpg', null, 3, null, 65, 'intermediate',
   '{quads,hamstrings,glutes,calves}', false, 'hypertrophy'),

  -- Fat Loss and Strength: sequential circuits + optional walk
  ('c0000000-0000-4000-8000-000000000021', 'b0000000-0000-4000-8000-000000000003',
   'Strength Circuit A', 'strength-circuit-a', 'full_body',
   'Full-body strength with a short bike finisher.',
   'covers/workouts/strength-circuit-a.jpg', 1, null, null, 45, 'beginner',
   '{legs,back,chest}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000022', 'b0000000-0000-4000-8000-000000000003',
   'Strength Circuit B', 'strength-circuit-b', 'full_body',
   'Full-body strength with a brisk incline-walk finisher.',
   'covers/workouts/strength-circuit-b.jpg', 2, null, null, 45, 'beginner',
   '{legs,back,core}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000023', 'b0000000-0000-4000-8000-000000000003',
   'Conditioning Walk', 'conditioning-walk', 'cardio',
   'Optional 30–45 minute brisk walk. Low impact, high value.',
   'covers/workouts/conditioning-walk.jpg', null, null, null, 40, 'beginner',
   '{cardio}', true, 'cardio'),

  -- General Fitness: sequential + optional mobility
  ('c0000000-0000-4000-8000-000000000031', 'b0000000-0000-4000-8000-000000000004',
   'Full Body 1', 'full-body-1', 'full_body',
   'Squat, row and press basics with core control.',
   'covers/workouts/full-body-1.jpg', 1, null, null, 40, 'beginner',
   '{legs,back,chest,core}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000032', 'b0000000-0000-4000-8000-000000000004',
   'Full Body 2', 'full-body-2', 'full_body',
   'Hinge, pulldown and glute work with anti-rotation core.',
   'covers/workouts/full-body-2.jpg', 2, null, null, 40, 'beginner',
   '{hamstrings,back,glutes,core}', false, 'strength'),
  ('c0000000-0000-4000-8000-000000000033', 'b0000000-0000-4000-8000-000000000004',
   'Mobility & Cardio', 'mobility-cardio', 'recovery',
   'Optional mobility flow plus easy cardio.',
   'covers/workouts/mobility-cardio.jpg', null, null, null, 30, 'beginner',
   '{shoulders,core,cardio}', true, 'mobility')
on conflict (program_id, slug) do nothing;

-- ============================================================
-- Workout template exercises
-- ============================================================
insert into public.workout_template_exercises
  (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rep_target, rest_seconds, notes, is_optional)
values
  -- Full Body A
  ('c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 1, 3, 8, 10, null, 90, 'Start light; add reps before weight.', false),
  ('c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004', 2, 3, 10, 12, null, 90, null, false),
  ('c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000006', 3, 3, 8, 10, null, 90, 'Shoulder caution: stop at 2/10 pain and substitute Incline Push-Up.', false),
  ('c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000008', 4, 3, 10, 12, null, 60, null, false),
  ('c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000009', 5, 3, null, null, '20–40s hold', 60, 'Raise hands to a bench if the shoulder complains.', false),
  ('c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000d', 6, 2, 12, 15, null, 60, 'Light. Shoulder-health work.', true),

  -- Full Body B
  ('c0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 1, 3, 10, 12, null, 90, null, false),
  ('c0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000005', 2, 3, 10, 12, null, 90, 'Neutral grip. Never behind the neck.', false),
  ('c0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000003', 3, 3, 8, 10, null, 90, null, false),
  ('c0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000007', 4, 3, 8, 12, null, 75, 'Pick an incline height that keeps the shoulder happy.', false),
  ('c0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-00000000000a', 5, 3, 8, 10, null, 60, '8–10 per side.', false),
  ('c0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-00000000000c', 6, 2, 8, 10, null, 45, 'Pain-free range only.', true),

  -- Recovery C
  ('c0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000013', 1, 1, null, null, '12–15 min easy', 0, 'Conversational pace.', false),
  ('c0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-00000000000b', 2, 2, 8, 8, null, 45, '8 per side, slow.', false),
  ('c0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000008', 3, 2, 12, 15, null, 45, null, false),
  ('c0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-00000000000c', 4, 2, 8, 10, null, 45, 'Gentle shoulder mobility.', false),
  ('c0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000014', 5, 1, null, null, '10 min brisk', 0, null, true),

  -- Push Day
  ('c0000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000018', 1, 3, 8, 12, null, 120, '1–2 reps in reserve.', false),
  ('c0000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000019', 2, 3, 8, 12, null, 90, null, false),
  ('c0000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-00000000000e', 3, 3, 8, 10, null, 90, 'Shoulder-friendlier vertical press.', false),
  ('c0000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000016', 4, 2, 12, 15, null, 60, 'Light and strict; sub Face Pull if the shoulder complains.', true),
  ('c0000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000012', 5, 3, 10, 12, null, 60, null, false),

  -- Pull Day
  ('c0000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-000000000005', 1, 3, 8, 12, null, 120, null, false),
  ('c0000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-000000000004', 2, 3, 8, 12, null, 90, null, false),
  ('c0000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-00000000001a', 3, 3, 10, 12, null, 90, 'Per side.', false),
  ('c0000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-00000000000d', 4, 3, 12, 15, null, 60, null, false),
  ('c0000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-000000000011', 5, 3, 10, 12, null, 60, null, false),

  -- Leg Day
  ('c0000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-000000000002', 1, 4, 8, 12, null, 120, null, false),
  ('c0000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-000000000003', 2, 3, 8, 10, null, 90, null, false),
  ('c0000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-00000000001b', 3, 3, 10, 10, null, 90, '10 per leg.', false),
  ('c0000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-000000000015', 4, 2, 12, 15, null, 60, null, false),
  ('c0000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-00000000000f', 5, 2, 10, 12, null, 60, null, false),
  ('c0000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-000000000010', 6, 3, 10, 15, null, 60, null, false),

  -- Strength Circuit A
  ('c0000000-0000-4000-8000-000000000021', 'e0000000-0000-4000-8000-000000000001', 1, 3, 10, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000021', 'e0000000-0000-4000-8000-000000000007', 2, 3, 8, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000021', 'e0000000-0000-4000-8000-000000000004', 3, 3, 10, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000021', 'e0000000-0000-4000-8000-000000000008', 4, 3, 12, 15, null, 60, null, false),
  ('c0000000-0000-4000-8000-000000000021', 'e0000000-0000-4000-8000-000000000013', 5, 1, null, null, '10 min moderate', 0, 'Finisher.', false),

  -- Strength Circuit B
  ('c0000000-0000-4000-8000-000000000022', 'e0000000-0000-4000-8000-000000000002', 1, 3, 10, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000022', 'e0000000-0000-4000-8000-000000000005', 2, 3, 10, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000022', 'e0000000-0000-4000-8000-000000000003', 3, 3, 10, 10, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000022', 'e0000000-0000-4000-8000-000000000009', 4, 3, null, null, '30s hold', 45, null, false),
  ('c0000000-0000-4000-8000-000000000022', 'e0000000-0000-4000-8000-000000000014', 5, 1, null, null, '10 min incline', 0, 'Finisher.', false),

  -- Conditioning Walk
  ('c0000000-0000-4000-8000-000000000023', 'e0000000-0000-4000-8000-000000000014', 1, 1, null, null, '30–45 min brisk', 0, 'Outdoors counts too — log the time.', false),

  -- General Fitness 1
  ('c0000000-0000-4000-8000-000000000031', 'e0000000-0000-4000-8000-000000000001', 1, 3, 8, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000031', 'e0000000-0000-4000-8000-000000000004', 2, 3, 10, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000031', 'e0000000-0000-4000-8000-000000000007', 3, 3, 8, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000031', 'e0000000-0000-4000-8000-00000000000a', 4, 2, 8, 10, null, 45, 'Per side.', false),
  ('c0000000-0000-4000-8000-000000000031', 'e0000000-0000-4000-8000-000000000013', 5, 1, null, null, '8–10 min easy', 0, null, true),

  -- General Fitness 2
  ('c0000000-0000-4000-8000-000000000032', 'e0000000-0000-4000-8000-000000000003', 1, 3, 8, 10, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000032', 'e0000000-0000-4000-8000-000000000005', 2, 3, 10, 12, null, 75, null, false),
  ('c0000000-0000-4000-8000-000000000032', 'e0000000-0000-4000-8000-000000000008', 3, 3, 12, 15, null, 60, null, false),
  ('c0000000-0000-4000-8000-000000000032', 'e0000000-0000-4000-8000-00000000000b', 4, 2, 8, 8, null, 45, 'Per side.', false),
  ('c0000000-0000-4000-8000-000000000032', 'e0000000-0000-4000-8000-000000000014', 5, 1, null, null, '8–10 min brisk', 0, null, true),

  -- Mobility & Cardio
  ('c0000000-0000-4000-8000-000000000033', 'e0000000-0000-4000-8000-00000000000c', 1, 2, 8, 10, null, 45, null, false),
  ('c0000000-0000-4000-8000-000000000033', 'e0000000-0000-4000-8000-00000000000b', 2, 2, 8, 8, null, 45, 'Per side.', false),
  ('c0000000-0000-4000-8000-000000000033', 'e0000000-0000-4000-8000-000000000017', 3, 2, null, null, '20–30s per side', 45, null, false),
  ('c0000000-0000-4000-8000-000000000033', 'e0000000-0000-4000-8000-000000000014', 4, 1, null, null, '15 min easy', 0, null, false)
on conflict (workout_template_id, position) do nothing;

-- ============================================================
-- Placeholder cover-image records (status 'draft' = placeholder;
-- admins replace via Admin > Media, then publish)
-- ============================================================
insert into public.media_assets (storage_bucket, storage_path, media_type, alt_text, status)
select 'media', p.cover_image_path, 'image',
       p.name || ' cover image (placeholder — upload via Admin > Media)', 'draft'
from public.programs p
where p.cover_image_path is not null
on conflict (storage_bucket, storage_path) do nothing;

insert into public.media_assets (storage_bucket, storage_path, media_type, alt_text, status)
select 'media', g.cover_image_path, 'image',
       g.name || ' goal cover image (placeholder — upload via Admin > Media)', 'draft'
from public.fitness_goals g
where g.cover_image_path is not null
on conflict (storage_bucket, storage_path) do nothing;

insert into public.media_assets (storage_bucket, storage_path, media_type, alt_text, status)
select 'media', w.cover_image_path, 'image',
       w.name || ' workout cover image (placeholder — upload via Admin > Media)', 'draft'
from public.workout_templates w
where w.cover_image_path is not null
on conflict (storage_bucket, storage_path) do nothing;

-- ============================================================
-- Featured dashboard content
-- ============================================================
insert into public.featured_content
  (placement, content_type, content_id, image_path, headline, subheading,
   call_to_action_label, call_to_action_href, display_order, active)
values
  ('dashboard_discover', 'program', 'b0000000-0000-4000-8000-000000000001',
   'covers/programs/beginner-strength-foundations.jpg',
   'Start strong. Stay strong.',
   'The 12-week Beginner Strength Foundations plan — flexible, shoulder-aware, built for real life.',
   'View Program', '/programs/beginner-strength-foundations', 1, true),
  ('dashboard_discover', 'program', 'b0000000-0000-4000-8000-000000000002',
   'covers/programs/bodybuilding-foundations.jpg',
   'Build your foundation.',
   'Bodybuilding Foundations — a clean push/pull/legs split for balanced development.',
   'View Program', '/programs/bodybuilding-foundations', 2, true)
on conflict do nothing;

-- ============================================================
-- App settings defaults
-- ============================================================
insert into public.app_settings (key, value) values
  ('branding', '{"name": "Stellio Fit", "tagline": "Train Smarter. Build Stronger."}'),
  ('safety', '{"pain_threshold": 2, "pain_alert_threshold": 5}')
on conflict (key) do nothing;
