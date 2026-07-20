-- Stellio Fit — Cardio expansion: exercises, workouts, programs
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING throughout.
-- New exercises: e0000000-0000-4000-8000-000000000040 through 00000000004c
-- New programs:  b0000000-0000-4000-8000-00000000000e through 000000000010
-- New workouts:  c0000000-0000-4000-8000-0000000000e1 through 0000000000ff

-- ============================================================
-- New cardio exercises
-- ============================================================
insert into public.exercises
  (id, name, slug, category, primary_muscles, secondary_muscles, equipment, difficulty,
   instructions, technique_cues, shoulder_safe, shoulder_notes, cover_image_path, status)
values
  ('e0000000-0000-4000-8000-000000000040', 'Outdoor Running', 'outdoor-running', 'cardio',
   '{cardio,legs}', '{calves,core}', '{cardio}', 'beginner',
   'Run at a conversational pace for aerobic development, or faster for intervals. Land midfoot, swing the arms naturally, and breathe rhythmically.',
   '{"Tall posture","Midfoot strike","Relaxed shoulders"}',
   true, null, 'https://images.pexels.com/photos/29138747/pexels-photo-29138747.jpeg?auto=compress&cs=tinysrgb&w=400', 'published'),

  ('e0000000-0000-4000-8000-000000000041', 'Rowing Machine', 'rowing-machine', 'cardio',
   '{cardio,back,legs}', '{core,arms}', '{cardio}', 'beginner',
   'Drive through your legs first, then pull with your arms. Return arms, then legs, in reverse order. Smooth and powerful strokes.',
   '{"Legs drive first","Straight back","Pull to lower ribs"}',
   true, 'Rowing is generally shoulder-safe if you keep a straight back and don''t over-reach.', 'https://images.pexels.com/photos/2294400/pexels-photo-2294400.jpeg?auto=compress&cs=tinysrgb&w=400', 'published'),

  ('e0000000-0000-4000-8000-000000000042', 'Stationary Cycling', 'stationary-cycling', 'cardio',
   '{cardio,quads}', '{calves,glutes}', '{cardio}', 'beginner',
   'Ride at a steady cadence. Adjust the seat so your knee has a slight bend at the bottom of the pedal stroke. Keep light resistance for warm-ups, heavier for intervals.',
   '{"Smooth cadence","Relaxed upper body","Slight knee bend at bottom"}',
   true, null, 'https://images.pexels.com/photos/26726128/pexels-photo-26726128.jpeg?auto=compress&cs=tinysrgb&w=400', 'published'),

  ('e0000000-0000-4000-8000-000000000043', 'Stair Climber', 'stair-climber', 'cardio',
   '{cardio,glutes,quads}', '{calves}', '{cardio}', 'beginner',
   'Step smoothly without leaning on the handrails. Light pace for endurance, faster for intensity. Whole foot on each step.',
   '{"Light hand touch only","Whole foot on step","Steady rhythm"}',
   true, null, 'https://images.pexels.com/photos/976872/pexels-photo-976872.jpeg?auto=compress&cs=tinysrgb&w=400', 'published'),

  ('e0000000-0000-4000-8000-000000000044', 'Elliptical', 'elliptical', 'cardio',
   '{cardio,legs}', '{core,arms}', '{cardio}', 'beginner',
   'Push and pull the handles while striding smoothly. Keep tall posture and resist the urge to bounce.',
   '{"Tall posture","Smooth strides","Use the handles"}',
   true, null, 'https://images.pexels.com/photos/5253867/pexels-photo-5253867.jpeg?auto=compress&cs=tinysrgb&w=400', 'published'),

  ('e0000000-0000-4000-8000-000000000045', 'Treadmill Run', 'treadmill-run', 'cardio',
   '{cardio,legs}', '{calves,core}', '{cardio}', 'beginner',
   'Run on the treadmill at a comfortable pace. Use a slight incline (1-2%) to mimic outdoor running. Look forward, not down.',
   '{"Look forward","Midfoot strike","Relaxed arms"}',
   true, null, 'https://images.pexels.com/photos/4943916/pexels-photo-4943916.jpeg?auto=compress&cs=tinysrgb&w=400', 'published'),

  ('e0000000-0000-4000-8000-000000000046', 'High Knees', 'high-knees', 'cardio',
   '{cardio,legs}', '{core}', '{bodyweight}', 'beginner',
   'Run on the spot, driving your knees up to hip height. Pump your arms and stay on the balls of your feet.',
   '{"Knees to hip height","Stay on balls of feet","Pump the arms"}',
   true, null, 'https://images.pexels.com/photos/6339601/pexels-photo-6339601.jpeg?auto=compress&cs=tinysrgb&w=400', 'published'),

  ('e0000000-0000-4000-8000-000000000047', 'Sprint', 'sprint', 'cardio',
   '{cardio,legs}', '{glutes,calves}', '{cardio}', 'advanced',
   'Accelerate to near maximum speed over a short distance (20-100m). Drive hard with the arms and legs, then decelerate gradually.',
   '{"Drive the arms","Land on forefoot","Full hip extension"}',
   true, 'Sprinting is high impact — warm up thoroughly. Stop if any sharp pain occurs.', 'https://images.pexels.com/photos/8820689/pexels-photo-8820689.jpeg?auto=compress&cs=tinysrgb&w=400', 'published'),

  ('e0000000-0000-4000-8000-000000000048', 'Battle Ropes', 'battle-ropes', 'cardio',
   '{cardio,shoulders,arms}', '{core,back}', '{cardio}', 'intermediate',
   'Grip the ends of the ropes and create fast, powerful waves. Keep a slight knee bend and a strong, braced core.',
   '{"Strong brace","Fast waves","Slight knee bend"}',
   true, 'Rope waves are generally shoulder-safe — stop if the shoulder pinches.', 'https://images.pexels.com/photos/8520394/pexels-photo-8520394.jpeg?auto=compress&cs=tinysrgb&w=400', 'published'),

  ('e0000000-0000-4000-8000-000000000049', 'Step-Up', 'step-up', 'cardio',
   '{cardio,glutes,quads}', '{hamstrings}', '{bodyweight,box}', 'beginner',
   'Step onto a box or bench, drive through the top foot to stand tall, then lower with control. Alternate legs.',
   '{"Drive through top foot","Stand tall at the top","Control the descent"}',
   true, null, 'https://images.pexels.com/photos/4047022/pexels-photo-4047022.jpeg?auto=compress&cs=tinysrgb&w=400', 'published'),

  ('e0000000-0000-4000-8000-00000000004a', 'Shadow Boxing', 'shadow-boxing', 'cardio',
   '{cardio,shoulders,core}', '{arms}', '{bodyweight}', 'beginner',
   'Throw combinations of jabs, crosses, hooks, and uppercuts to an imaginary opponent. Stay light on your feet and keep your guard up.',
   '{"Light on the feet","Guard up","Rotate through the hips"}',
   true, 'Gentle on the shoulder if you don''t fully lock out punches. Keep movements smooth.', 'https://images.pexels.com/photos/4761790/pexels-photo-4761790.jpeg?auto=compress&cs=tinysrgb&w=400', 'published'),

  ('e0000000-0000-4000-8000-00000000004b', 'Dance Cardio', 'dance-cardio', 'cardio',
   '{cardio}', '{legs,core}', '{bodyweight}', 'beginner',
   'Follow a dance-based cardio routine. Move with rhythm and energy — the goal is sustained movement and fun, not perfect choreography.',
   '{"Move with rhythm","Stay light on your feet","Have fun"}',
   true, null, 'https://images.pexels.com/photos/8957649/pexels-photo-8957649.jpeg?auto=compress&cs=tinysrgb&w=400', 'published'),

  ('e0000000-0000-4000-8000-00000000004c', 'Stair Sprint', 'stair-sprint', 'cardio',
   '{cardio,glutes,quads}', '{calves}', '{cardio}', 'intermediate',
   'Find a set of stairs and sprint up them with full effort. Walk down to recover. Short, intense bursts.',
   '{"Drive hard up","Walk down to recover","Two feet per stair or skip one"}',
   true, 'High impact on the descent — take the recovery seriously.', 'https://images.pexels.com/photos/4162487/pexels-photo-4162487.jpeg?auto=compress&cs=tinysrgb&w=400', 'published')
on conflict (slug) do nothing;

-- ============================================================
-- Exercise videos for new cardio exercises
-- ============================================================
insert into public.exercise_videos
  (exercise_id, provider, source_url, provider_video_id, embed_url, thumbnail_url,
   title, creator_name, verification_status, admin_notes, active)
values
  ('e0000000-0000-4000-8000-000000000040', 'youtube', 'https://www.youtube.com/watch?v=_kGESn8ArrU', '_kGESn8ArrU',
   'https://www.youtube-nocookie.com/embed/_kGESn8ArrU', 'https://img.youtube.com/vi/_kGESn8ArrU/hqdefault.jpg',
   'Outdoor Running — technique tutorial', null, 'unverified',
   'Auto-attached from YouTube search for exercise technique tutorial. Please review and mark verified in Admin > Videos.', true),
  ('e0000000-0000-4000-8000-000000000041', 'youtube', 'https://www.youtube.com/watch?v=ZN0J6qKCIrI', 'ZN0J6qKCIrI',
   'https://www.youtube-nocookie.com/embed/ZN0J6qKCIrI', 'https://img.youtube.com/vi/ZN0J6qKCIrI/hqdefault.jpg',
   'Rowing Machine — technique tutorial', null, 'unverified',
   'Auto-attached from YouTube search for exercise technique tutorial. Please review and mark verified in Admin > Videos.', true),
  ('e0000000-0000-4000-8000-000000000042', 'youtube', 'https://www.youtube.com/watch?v=YAO677Zrtjk', 'YAO677Zrtjk',
   'https://www.youtube-nocookie.com/embed/YAO677Zrtjk', 'https://img.youtube.com/vi/YAO677Zrtjk/hqdefault.jpg',
   'Stationary Cycling — technique tutorial', null, 'unverified',
   'Auto-attached from YouTube search for exercise technique tutorial. Please review and mark verified in Admin > Videos.', true),
  ('e0000000-0000-4000-8000-000000000043', 'youtube', 'https://www.youtube.com/watch?v=6mYp_BNYD5Y', '6mYp_BNYD5Y',
   'https://www.youtube-nocookie.com/embed/6mYp_BNYD5Y', 'https://img.youtube.com/vi/6mYp_BNYD5Y/hqdefault.jpg',
   'Stair Climber — technique tutorial', null, 'unverified',
   'Auto-attached from YouTube search for exercise technique tutorial. Please review and mark verified in Admin > Videos.', true),
  ('e0000000-0000-4000-8000-000000000044', 'youtube', 'https://www.youtube.com/watch?v=dBMotc3AiVc', 'dBMotc3AiVc',
   'https://www.youtube-nocookie.com/embed/dBMotc3AiVc', 'https://img.youtube.com/vi/dBMotc3AiVc/hqdefault.jpg',
   'Elliptical — technique tutorial', null, 'unverified',
   'Auto-attached from YouTube search for exercise technique tutorial. Please review and mark verified in Admin > Videos.', true),
  ('e0000000-0000-4000-8000-000000000045', 'youtube', 'https://www.youtube.com/watch?v=K6I24WgiiPw', 'K6I24WgiiPw',
   'https://www.youtube-nocookie.com/embed/K6I24WgiiPw', 'https://img.youtube.com/vi/K6I24WgiiPw/hqdefault.jpg',
   'Treadmill Run — technique tutorial', null, 'unverified',
   'Auto-attached from YouTube search for exercise technique tutorial. Please review and mark verified in Admin > Videos.', true),
  ('e0000000-0000-4000-8000-000000000046', 'youtube', 'https://www.youtube.com/watch?v=d9kQK5Ds0wo', 'd9kQK5Ds0wo',
   'https://www.youtube-nocookie.com/embed/d9kQK5Ds0wo', 'https://img.youtube.com/vi/d9kQK5Ds0wo/hqdefault.jpg',
   'High Knees — technique tutorial', null, 'unverified',
   'Auto-attached from YouTube search for exercise technique tutorial. Please review and mark verified in Admin > Videos.', true),
  ('e0000000-0000-4000-8000-000000000047', 'youtube', 'https://www.youtube.com/watch?v=6m_fjNhRhkY', '6m_fjNhRhkY',
   'https://www.youtube-nocookie.com/embed/6m_fjNhRhkY', 'https://img.youtube.com/vi/6m_fjNhRhkY/hqdefault.jpg',
   'Sprint — technique tutorial', null, 'unverified',
   'Auto-attached from YouTube search for exercise technique tutorial. Please review and mark verified in Admin > Videos.', true),
  ('e0000000-0000-4000-8000-000000000048', 'youtube', 'https://www.youtube.com/watch?v=Bmdhgscsk-Y', 'Bmdhgscsk-Y',
   'https://www.youtube-nocookie.com/embed/Bmdhgscsk-Y', 'https://img.youtube.com/vi/Bmdhgscsk-Y/hqdefault.jpg',
   'Battle Ropes — technique tutorial', null, 'unverified',
   'Auto-attached from YouTube search for exercise technique tutorial. Please review and mark verified in Admin > Videos.', true),
  ('e0000000-0000-4000-8000-000000000049', 'youtube', 'https://www.youtube.com/watch?v=wfhXnLILqdk', 'wfhXnLILqdk',
   'https://www.youtube-nocookie.com/embed/wfhXnLILqdk', 'https://img.youtube.com/vi/wfhXnLILqdk/hqdefault.jpg',
   'Step-Up — technique tutorial', null, 'unverified',
   'Auto-attached from YouTube search for exercise technique tutorial. Please review and mark verified in Admin > Videos.', true),
  ('e0000000-0000-4000-8000-00000000004a', 'youtube', 'https://www.youtube.com/watch?v=J4j3AOVWuHE', 'J4j3AOVWuHE',
   'https://www.youtube-nocookie.com/embed/J4j3AOVWuHE', 'https://img.youtube.com/vi/J4j3AOVWuHE/hqdefault.jpg',
   'Shadow Boxing — technique tutorial', null, 'unverified',
   'Auto-attached from YouTube search for exercise technique tutorial. Please review and mark verified in Admin > Videos.', true),
  ('e0000000-0000-4000-8000-00000000004b', 'youtube', 'https://www.youtube.com/watch?v=A7eKMgSAOAw', 'A7eKMgSAOAw',
   'https://www.youtube-nocookie.com/embed/A7eKMgSAOAw', 'https://img.youtube.com/vi/A7eKMgSAOAw/hqdefault.jpg',
   'Dance Cardio — technique tutorial', null, 'unverified',
   'Auto-attached from YouTube search for exercise technique tutorial. Please review and mark verified in Admin > Videos.', true),
  ('e0000000-0000-4000-8000-00000000004c', 'youtube', 'https://www.youtube.com/watch?v=5uYv9Y_nYx8', '5uYv9Y_nYx8',
   'https://www.youtube-nocookie.com/embed/5uYv9Y_nYx8', 'https://img.youtube.com/vi/5uYv9Y_nYx8/hqdefault.jpg',
   'Stair Sprint — technique tutorial', null, 'unverified',
   'Auto-attached from YouTube search for exercise technique tutorial. Please review and mark verified in Admin > Videos.', true)
on conflict do nothing;

-- ============================================================
-- New cardio programs
-- ============================================================
insert into public.programs
  (id, fitness_goal_id, name, slug, short_description, description, cover_image_path,
   experience_level, scheduling_mode, duration_weeks, minimum_days_per_week, maximum_days_per_week,
   estimated_session_minutes, equipment_requirements, difficulty, status, featured, safety_notes, published_at, version)
values
  -- 14. Cardio Foundations
  ('b0000000-0000-4000-8000-00000000000e',
   'd0000000-0000-4000-8000-000000000003',
   'Cardio Foundations', 'cardio-foundations',
   'A 6-week intro to cardio training for beginners who want to build a stronger heart and lungs.',
   'Six weeks of progressive cardio training that starts with easy walking and builds to steady-state running and intervals. Three sessions per week with optional easy days. Suitable for anyone returning to cardio or starting fresh.',
   'https://images.pexels.com/photos/5961852/pexels-photo-5961852.jpeg?auto=compress&cs=tinysrgb&w=800',
   'beginner', 'sequential', 6, 3, 4, 30,
   '{cardio,bodyweight}', 'beginner', 'published', false,
   'Start easy. If you feel breathless or dizzy, slow down or stop. Build gradually — consistency beats intensity.',
   now(), 1),

  -- 15. HIIT 8-Week
  ('b0000000-0000-4000-8000-00000000000f',
   'd0000000-0000-4000-8000-000000000003',
   'HIIT 8-Week', 'hiit-8-week',
   '8 weeks of high-intensity interval training to burn fat and build explosive conditioning.',
   'A progressive high-intensity interval training program. Short, intense work bouts separated by rest, scaling from 20s on / 40s off to 40s on / 20s off across 8 weeks. Three sessions per week, 25-30 minutes each.',
   'https://images.pexels.com/photos/8520394/pexels-photo-8520394.jpeg?auto=compress&cs=tinysrgb&w=800',
   'intermediate', 'sequential', 8, 3, 4, 30,
   '{bodyweight,cardio}', 'intermediate', 'published', false,
   'High-intensity work carries more risk. Warm up fully and stop if you feel sharp pain or dizziness. Drop the intensity if your form breaks down.',
   now(), 1),

  -- 16. Run 5K
  ('b0000000-0000-4000-8000-000000000010',
   'd0000000-0000-4000-8000-000000000003',
   'Run 5K', 'run-5k',
   'An 8-week program to take you from couch to completing a 5K run.',
   'A gradual 8-week running program for non-runners. A mix of walk/run intervals that slowly increase running time until you can run 5K continuously. Three sessions per week with optional easy cardio on rest days.',
   'https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg?auto=compress&cs=tinysrgb&w=800',
   'beginner', 'sequential', 8, 3, 4, 30,
   '{cardio}', 'beginner', 'published', false,
   'Follow the walk/run intervals exactly — don''t push to run further. Progress is in the plan, not in your willpower.',
   now(), 1)
on conflict (slug) do nothing;

-- ============================================================
-- Program weeks
-- ============================================================

-- Cardio Foundations (6 weeks)
insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-00000000000e', 1, 'Week 1', 'Easy walking and short intervals', false, 'Keep it conversational.'),
  ('b0000000-0000-4000-8000-00000000000e', 2, 'Week 2', 'Add short jogging bouts', false, null),
  ('b0000000-0000-4000-8000-00000000000e', 3, 'Week 3', 'Longer jog intervals', false, null),
  ('b0000000-0000-4000-8000-00000000000e', 4, 'Deload', 'Lighter week', true, 'Drop volume ~20%.'),
  ('b0000000-0000-4000-8000-00000000000e', 5, 'Build', 'Steady-state cardio', false, null),
  ('b0000000-0000-4000-8000-00000000000e', 6, 'Finish', 'Consolidate gains', false, 'You should feel noticeably fitter.')
on conflict (program_id, week_number) do nothing;

-- HIIT 8-Week
insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-00000000000f', 1, 'Week 1', '20s on / 40s off', false, 'Learn the intervals.'),
  ('b0000000-0000-4000-8000-00000000000f', 2, 'Week 2', '20s on / 40s off', false, 'Push the work bouts.'),
  ('b0000000-0000-4000-8000-00000000000f', 3, 'Week 3', '30s on / 30s off', false, null),
  ('b0000000-0000-4000-8000-00000000000f', 4, 'Deload', 'Lighter week', true, 'Reduce rounds by 25%.'),
  ('b0000000-0000-4000-8000-00000000000f', 5, 'Build', '30s on / 30s off', false, null),
  ('b0000000-0000-4000-8000-00000000000f', 6, 'Build', '40s on / 20s off', false, 'Top of build block.'),
  ('b0000000-0000-4000-8000-00000000000f', 7, 'Push', '40s on / 20s off', false, 'More rounds.'),
  ('b0000000-0000-4000-8000-00000000000f', 8, 'Consolidation', 'Lock in gains', false, 'Reflect on 8 weeks of progress.')
on conflict (program_id, week_number) do nothing;

-- Run 5K (8 weeks)
insert into public.program_weeks (program_id, week_number, name, focus, is_deload, notes) values
  ('b0000000-0000-4000-8000-000000000010', 1, 'Week 1', 'Walk/run 1:1', false, 'Walk 1 min, jog 1 min, repeat.'),
  ('b0000000-0000-4000-8000-000000000010', 2, 'Week 2', 'Walk/run 1:2', false, 'More running, less walking.'),
  ('b0000000-0000-4000-8000-000000000010', 3, 'Week 3', 'Run 5 min blocks', false, null),
  ('b0000000-0000-4000-8000-000000000010', 4, 'Deload', 'Lighter week', true, 'Reduce running time 20%.'),
  ('b0000000-0000-4000-8000-000000000010', 5, 'Build', 'Run 10 min blocks', false, null),
  ('b0000000-0000-4000-8000-000000000010', 6, 'Build', 'Run 15 min blocks', false, null),
  ('b0000000-0000-4000-8000-000000000010', 7, 'Push', 'Run 20 min blocks', false, null),
  ('b0000000-0000-4000-8000-000000000010', 8, 'Finish', 'Run 5K continuous', false, 'You can do it!')
on conflict (program_id, week_number) do nothing;

-- ============================================================
-- Workout templates
-- ============================================================
insert into public.workout_templates
  (id, program_id, name, slug, category, description, cover_image_path,
   sequence_order, week_position, day_of_week, estimated_minutes, difficulty,
   target_muscle_groups, is_optional, workout_type)
values
  -- Program 14: Cardio Foundations (3 days + optional)
  ('c0000000-0000-4000-8000-0000000000e1', 'b0000000-0000-4000-8000-00000000000e',
   'Easy Cardio', 'cardio-easy', 'cardio',
   '20-30 minutes of easy walking or cycling. Conversational pace.',
   'https://images.pexels.com/photos/5253867/pexels-photo-5253867.jpeg?auto=compress&cs=tinysrgb&w=400',
   1, null, null, 25, 'beginner', '{cardio}', false, 'cardio'),
  ('c0000000-0000-4000-8000-0000000000e2', 'b0000000-0000-4000-8000-00000000000e',
   'Intervals', 'cardio-intervals', 'cardio',
   'Walk/run or bike intervals. 1 min hard, 2 min easy, repeat.',
   'https://images.pexels.com/photos/4943916/pexels-photo-4943916.jpeg?auto=compress&cs=tinysrgb&w=400',
   2, null, null, 30, 'beginner', '{cardio}', false, 'cardio'),
  ('c0000000-0000-4000-8000-0000000000e3', 'b0000000-0000-4000-8000-00000000000e',
   'Steady State', 'cardio-steady', 'cardio',
   '20-30 minutes of steady, moderate cardio. Talk-in-short-sentences pace.',
   'https://images.pexels.com/photos/26726128/pexels-photo-26726128.jpeg?auto=compress&cs=tinysrgb&w=400',
   3, null, null, 30, 'beginner', '{cardio}', false, 'cardio'),
  ('c0000000-0000-4000-8000-0000000000e4', 'b0000000-0000-4000-8000-00000000000e',
   'Optional Easy Day', 'cardio-optional-easy', 'cardio',
   'Optional 15-20 min easy walk or bike.',
   'https://images.pexels.com/photos/4162487/pexels-photo-4162487.jpeg?auto=compress&cs=tinysrgb&w=400',
   null, null, null, 20, 'beginner', '{cardio}', true, 'cardio'),

  -- Program 15: HIIT 8-Week (3 days + optional)
  ('c0000000-0000-4000-8000-0000000000f1', 'b0000000-0000-4000-8000-00000000000f',
   'HIIT Circuit A', 'hiit-circuit-a', 'cardio',
   'Bodyweight HIIT: burpees, mountain climbers, high knees, jumping jacks. 20s on / 40s off, 6 rounds.',
   'https://images.pexels.com/photos/6455813/pexels-photo-6455813.jpeg?auto=compress&cs=tinysrgb&w=400',
   1, null, null, 25, 'intermediate', '{cardio,legs,core}', false, 'cardio'),
  ('c0000000-0000-4000-8000-0000000000f2', 'b0000000-0000-4000-8000-00000000000f',
   'HIIT Circuit B', 'hiit-circuit-b', 'cardio',
   'Mixed modality HIIT: battle ropes, step-ups, shadow boxing, sprints. 30s on / 30s off.',
   'https://images.pexels.com/photos/8520394/pexels-photo-8520394.jpeg?auto=compress&cs=tinysrgb&w=400',
   2, null, null, 30, 'intermediate', '{cardio,shoulders,legs}', false, 'cardio'),
  ('c0000000-0000-4000-8000-0000000000f3', 'b0000000-0000-4000-8000-00000000000f',
   'HIIT Finisher', 'hiit-finisher', 'cardio',
   'Short, sharp finisher: stair sprints and high knees. 40s on / 20s off.',
   'https://images.pexels.com/photos/6339601/pexels-photo-6339601.jpeg?auto=compress&cs=tinysrgb&w=400',
   3, null, null, 20, 'intermediate', '{cardio,legs}', false, 'cardio'),
  ('c0000000-0000-4000-8000-0000000000f4', 'b0000000-0000-4000-8000-00000000000f',
   'Optional Mobility', 'hiit-optional-mobility', 'mobility',
   'Optional 10-minute mobility flow to aid recovery.',
   'https://images.pexels.com/photos/4753986/pexels-photo-4753986.jpeg?auto=compress&cs=tinysrgb&w=400',
   null, null, null, 10, 'beginner', '{shoulders,hips}', true, 'mobility'),

  -- Program 16: Run 5K (3 days + optional)
  ('c0000000-0000-4000-8000-000000000101', 'b0000000-0000-4000-8000-000000000010',
   'Run Session A', 'run-5k-a', 'cardio',
   'Walk/run intervals. Follow the week-by-week progression.',
   'https://images.pexels.com/photos/29138747/pexels-photo-29138747.jpeg?auto=compress&cs=tinysrgb&w=400',
   1, null, null, 30, 'beginner', '{cardio,legs}', false, 'cardio'),
  ('c0000000-0000-4000-8000-000000000102', 'b0000000-0000-4000-8000-000000000010',
   'Run Session B', 'run-5k-b', 'cardio',
   'Steady run, building duration each week.',
   'https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg?auto=compress&cs=tinysrgb&w=400',
   2, null, null, 30, 'beginner', '{cardio,legs}', false, 'cardio'),
  ('c0000000-0000-4000-8000-000000000103', 'b0000000-0000-4000-8000-000000000010',
   'Run Session C', 'run-5k-c', 'cardio',
   'Easy recovery run or walk. Conversational pace.',
   'https://images.pexels.com/photos/5961852/pexels-photo-5961852.jpeg?auto=compress&cs=tinysrgb&w=400',
   3, null, null, 30, 'beginner', '{cardio,legs}', false, 'cardio'),
  ('c0000000-0000-4000-8000-000000000104', 'b0000000-0000-4000-8000-000000000010',
   'Optional Cross Train', 'run-5k-optional-cross', 'cardio',
   'Optional easy cross-training: bike, swim, or elliptical.',
   'https://images.pexels.com/photos/2294400/pexels-photo-2294400.jpeg?auto=compress&cs=tinysrgb&w=400',
   null, null, null, 20, 'beginner', '{cardio}', true, 'cardio')
on conflict (program_id, slug) do nothing;

-- ============================================================
-- Workout template exercises
-- ============================================================
insert into public.workout_template_exercises
  (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rep_target, rest_seconds, notes, is_optional)
values
  -- Cardio Foundations: Easy Cardio
  ('c0000000-0000-4000-8000-0000000000e1', 'e0000000-0000-4000-8000-000000000014', 1, 1, null, null, '20-30 min easy', 0, 'Treadmill walk or outdoor walk. Conversational.', false),
  ('c0000000-0000-4000-8000-0000000000e1', 'e0000000-0000-4000-8000-000000000042', 2, 1, null, null, '20 min easy', 0, 'Bike option. Keep it light.', true),

  -- Cardio Foundations: Intervals
  ('c0000000-0000-4000-8000-0000000000e2', 'e0000000-0000-4000-8000-000000000045', 1, 1, null, null, '1 min on / 2 min off x6', 0, 'Treadmill intervals.', false),
  ('c0000000-0000-4000-8000-0000000000e2', 'e0000000-0000-4000-8000-000000000042', 2, 1, null, null, '1 min on / 2 min off x6', 0, 'Bike option.', true),

  -- Cardio Foundations: Steady State
  ('c0000000-0000-4000-8000-0000000000e3', 'e0000000-0000-4000-8000-000000000042', 1, 1, null, null, '20-30 min steady', 0, 'Bike at moderate pace.', false),
  ('c0000000-0000-4000-8000-0000000000e3', 'e0000000-0000-4000-8000-000000000044', 2, 1, null, null, '20-30 min steady', 0, 'Elliptical option.', true),

  -- Cardio Foundations: Optional Easy
  ('c0000000-0000-4000-8000-0000000000e4', 'e0000000-0000-4000-8000-000000000014', 1, 1, null, null, '15-20 min easy', 0, 'Easy walk.', false),

  -- HIIT Circuit A
  ('c0000000-0000-4000-8000-0000000000f1', 'e0000000-0000-4000-8000-00000000002f', 1, 6, null, null, '20s on / 40s off', 0, 'Burpees.', false),
  ('c0000000-0000-4000-8000-0000000000f1', 'e0000000-0000-4000-8000-00000000002d', 2, 6, null, null, '20s on / 40s off', 0, 'Mountain climbers.', false),
  ('c0000000-0000-4000-8000-0000000000f1', 'e0000000-0000-4000-8000-000000000046', 3, 6, null, null, '20s on / 40s off', 0, 'High knees.', false),
  ('c0000000-0000-4000-8000-0000000000f1', 'e0000000-0000-4000-8000-00000000002e', 4, 6, null, null, '20s on / 40s off', 0, 'Jumping jacks.', false),

  -- HIIT Circuit B
  ('c0000000-0000-4000-8000-0000000000f2', 'e0000000-0000-4000-8000-000000000048', 1, 6, null, null, '30s on / 30s off', 0, 'Battle ropes.', false),
  ('c0000000-0000-4000-8000-0000000000f2', 'e0000000-0000-4000-8000-000000000049', 2, 6, null, null, '30s on / 30s off', 0, 'Step-ups.', false),
  ('c0000000-0000-4000-8000-0000000000f2', 'e0000000-0000-4000-8000-00000000004a', 3, 6, null, null, '30s on / 30s off', 0, 'Shadow boxing.', false),
  ('c0000000-0000-4000-8000-0000000000f2', 'e0000000-0000-4000-8000-000000000047', 4, 6, null, null, '30s on / 30s off', 0, 'Sprint.', false),

  -- HIIT Finisher
  ('c0000000-0000-4000-8000-0000000000f3', 'e0000000-0000-4000-8000-00000000004c', 1, 8, null, null, '40s on / 20s off', 0, 'Stair sprints. Walk down to recover.', false),
  ('c0000000-0000-4000-8000-0000000000f3', 'e0000000-0000-4000-8000-000000000046', 2, 8, null, null, '40s on / 20s off', 0, 'High knees.', false),

  -- HIIT Optional Mobility
  ('c0000000-0000-4000-8000-0000000000f4', 'e0000000-0000-4000-8000-00000000003e', 1, 2, null, null, '45s per side', 30, 'Hip flexor stretch.', false),
  ('c0000000-0000-4000-8000-0000000000f4', 'e0000000-0000-4000-8000-00000000000c', 2, 2, null, null, '30s per side', 30, null, false),

  -- Run 5K Session A
  ('c0000000-0000-4000-8000-000000000101', 'e0000000-0000-4000-8000-000000000040', 1, 1, null, null, 'Walk/run intervals per week', 0, 'Follow the week-by-week progression.', false),
  ('c0000000-0000-4000-8000-000000000101', 'e0000000-0000-4000-8000-000000000045', 2, 1, null, null, 'Treadmill option', 0, 'Treadmill alternative if weather is bad.', true),

  -- Run 5K Session B
  ('c0000000-0000-4000-8000-000000000102', 'e0000000-0000-4000-8000-000000000040', 1, 1, null, null, 'Steady run per week', 0, 'Build duration weekly.', false),

  -- Run 5K Session C
  ('c0000000-0000-4000-8000-000000000103', 'e0000000-0000-4000-8000-000000000040', 1, 1, null, null, 'Easy run/walk', 0, 'Conversational pace.', false),

  -- Run 5K Optional Cross
  ('c0000000-0000-4000-8000-000000000104', 'e0000000-0000-4000-8000-000000000041', 1, 1, null, null, '20 min easy', 0, 'Rowing machine.', false),
  ('c0000000-0000-4000-8000-000000000104', 'e0000000-0000-4000-8000-000000000044', 2, 1, null, null, '20 min easy', 0, 'Elliptical option.', true)
on conflict (workout_template_id, position) do nothing;

-- ============================================================
-- Featured content for new cardio programs
-- ============================================================
insert into public.featured_content
  (placement, content_type, content_id, image_path, headline, subheading,
   call_to_action_label, call_to_action_href, display_order, active)
values
  ('dashboard_discover', 'program', 'b0000000-0000-4000-8000-00000000000e',
   'https://images.pexels.com/photos/5961852/pexels-photo-5961852.jpeg?auto=compress&cs=tinysrgb&w=800',
   'Build your engine.',
   'Cardio Foundations — 6 weeks from easy walks to steady cardio.',
   'View Program', '/programs/cardio-foundations', 7, true),
  ('dashboard_discover', 'program', 'b0000000-0000-4000-8000-00000000000f',
   'https://images.pexels.com/photos/8520394/pexels-photo-8520394.jpeg?auto=compress&cs=tinysrgb&w=800',
   'Go hard. Recover. Repeat.',
   'HIIT 8-Week — explosive conditioning in 30-minute sessions.',
   'View Program', '/programs/hiit-8-week', 8, true),
  ('dashboard_discover', 'program', 'b0000000-0000-4000-8000-000000000010',
   'https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg?auto=compress&cs=tinysrgb&w=800',
   'Couch to 5K.',
   'Run 5K — 8 weeks from walk/run to your first 5K.',
   'View Program', '/programs/run-5k', 9, true)
on conflict do nothing;
