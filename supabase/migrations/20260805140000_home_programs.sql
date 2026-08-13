-- ============================================================================
-- Home workout programs — dumbbell-only and no-equipment options.
-- Exercises are keyword-matched against the imported library via _pick_ex().
-- Staging-free (inline VALUES/CTEs), idempotent (on conflict do nothing).
-- ============================================================================

-- 1) Programs (goal + cover set inline)
insert into public.programs
  (name, slug, short_description, fitness_goal_id, experience_level, scheduling_mode,
   duration_weeks, minimum_days_per_week, maximum_days_per_week, estimated_session_minutes,
   difficulty, status, featured, published_at, cover_image_path)
select v.name, v.slug, v.descr,
       (select id from public.fitness_goals where slug = v.goal_slug),
       v.level, 'weekly_split', v.weeks, v.min_d, v.max_d, v.minutes,
       v.level, 'published', false, now(), v.cover
from (values
  ('home-dumbbell-fb','Home Dumbbell Full Body','A 3-day full-body plan you can run at home with just a pair of dumbbells.','muscle-gain','beginner',8,3,3,45,'https://images.pexels.com/photos/6550837/pexels-photo-6550837.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800'),
  ('home-dumbbell-ppl','Home Push / Pull / Legs (Dumbbell)','Dumbbell-only push, pull and legs — scale from 3 to 6 days a week.','muscle-gain','intermediate',8,3,6,50,'https://images.pexels.com/photos/4164759/pexels-photo-4164759.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800'),
  ('bodyweight-basics','Bodyweight Basics (No Equipment)','No gear needed — build strength and fitness with bodyweight only.','general-fitness','beginner',6,3,4,35,'https://images.pexels.com/photos/8038628/pexels-photo-8038628.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800'),
  ('home-hiit','Home HIIT & Conditioning','Fast, equipment-free circuits to burn calories and boost conditioning.','fat-loss','beginner',6,3,4,30,'https://images.pexels.com/photos/4807549/pexels-photo-4807549.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800')
) as v(slug, name, descr, goal_slug, level, weeks, min_d, max_d, minutes, cover)
on conflict (slug) do nothing;

-- 2) Workout templates
insert into public.workout_templates
  (program_id, name, slug, workout_type, week_position, estimated_minutes, difficulty, target_muscle_groups)
select p.id, v.name, v.slug, v.workout_type, v.week_position, v.minutes, v.difficulty, v.muscles
from (values
  ('home-dumbbell-fb','fb-a','Full Body A','strength',1,45,'beginner',array['chest','back','quads']),
  ('home-dumbbell-fb','fb-b','Full Body B','strength',2,45,'beginner',array['hamstrings','shoulders','back']),
  ('home-dumbbell-fb','fb-c','Full Body C','hypertrophy',3,45,'beginner',array['chest','quads','arms']),
  ('home-dumbbell-ppl','push','Push','hypertrophy',1,50,'intermediate',array['chest','shoulders','triceps']),
  ('home-dumbbell-ppl','pull','Pull','hypertrophy',2,50,'intermediate',array['back','lats','biceps']),
  ('home-dumbbell-ppl','legs','Legs','hypertrophy',3,50,'intermediate',array['quads','hamstrings','glutes','calves']),
  ('bodyweight-basics','bw-a','Bodyweight A','strength',1,35,'beginner',array['chest','quads','core']),
  ('bodyweight-basics','bw-b','Bodyweight B','strength',2,35,'beginner',array['shoulders','glutes','core']),
  ('bodyweight-basics','bw-c','Bodyweight C','strength',3,35,'beginner',array['chest','quads','core']),
  ('home-hiit','hiit-a','Circuit A','conditioning',1,30,'beginner',array['cardio','quads','core']),
  ('home-hiit','hiit-b','Circuit B','conditioning',2,30,'beginner',array['cardio','chest','core']),
  ('home-hiit','hiit-c','Circuit C','conditioning',3,30,'beginner',array['cardio','glutes','core'])
) as v(program_slug, slug, name, workout_type, week_position, minutes, difficulty, muscles)
join public.programs p on p.slug = v.program_slug
on conflict (program_id, slug) do nothing;

-- 3) Template exercises  (program, template, position, keyword, muscle, sets, repMin, repMax, rest, superset)
insert into public.workout_template_exercises
  (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rep_target, rest_seconds, superset_group)
select t.id,
       public._pick_ex(v.kw, v.muscle),
       v.position, v.sets, v.rep_min, v.rep_max,
       case when v.rep_min = v.rep_max then v.rep_min::text
            else v.rep_min::text || '-' || v.rep_max::text end,
       v.rest, v.superset
from (values
  -- Home Dumbbell Full Body
  ('home-dumbbell-fb','fb-a',1,'goblet squat','quads',3,8,12,90,null::int),
  ('home-dumbbell-fb','fb-a',2,'dumbbell bench press','chest',3,8,12,90,null),
  ('home-dumbbell-fb','fb-a',3,'dumbbell row','back',3,10,12,90,null),
  ('home-dumbbell-fb','fb-a',4,'dumbbell shoulder press','shoulders',3,10,12,75,null),
  ('home-dumbbell-fb','fb-a',5,'plank','core',3,30,60,45,null),
  ('home-dumbbell-fb','fb-b',1,'romanian deadlift','hamstrings',3,8,12,90,null),
  ('home-dumbbell-fb','fb-b',2,'incline dumbbell press','chest',3,10,12,90,null),
  ('home-dumbbell-fb','fb-b',3,'dumbbell lunge','quads',3,10,12,75,null),
  ('home-dumbbell-fb','fb-b',4,'lateral raise','shoulders',3,12,15,60,null),
  ('home-dumbbell-fb','fb-b',5,'dumbbell curl','biceps',3,10,12,60,null),
  ('home-dumbbell-fb','fb-c',1,'dumbbell step-up','quads',3,10,12,90,null),
  ('home-dumbbell-fb','fb-c',2,'push-up','chest',3,10,20,60,null),
  ('home-dumbbell-fb','fb-c',3,'dumbbell fly','chest',3,12,15,60,null),
  ('home-dumbbell-fb','fb-c',4,'hammer curl','biceps',3,10,12,60,null),
  ('home-dumbbell-fb','fb-c',5,'calf raise','calves',3,15,20,45,null),
  -- Home Dumbbell PPL
  ('home-dumbbell-ppl','push',1,'dumbbell bench press','chest',4,8,12,90,null),
  ('home-dumbbell-ppl','push',2,'dumbbell shoulder press','shoulders',3,8,12,90,null),
  ('home-dumbbell-ppl','push',3,'incline dumbbell press','chest',3,10,12,75,null),
  ('home-dumbbell-ppl','push',4,'lateral raise','shoulders',3,12,20,60,null),
  ('home-dumbbell-ppl','push',5,'triceps extension','triceps',3,10,15,60,null),
  ('home-dumbbell-ppl','push',6,'push-up','chest',3,12,20,60,null),
  ('home-dumbbell-ppl','pull',1,'dumbbell row','back',4,8,12,90,null),
  ('home-dumbbell-ppl','pull',2,'reverse fly','shoulders',3,12,15,60,null),
  ('home-dumbbell-ppl','pull',3,'dumbbell shrug','back',3,12,15,60,null),
  ('home-dumbbell-ppl','pull',4,'dumbbell curl','biceps',3,10,12,60,null),
  ('home-dumbbell-ppl','pull',5,'hammer curl','biceps',3,12,15,60,null),
  ('home-dumbbell-ppl','legs',1,'goblet squat','quads',4,8,12,120,null),
  ('home-dumbbell-ppl','legs',2,'romanian deadlift','hamstrings',3,8,12,90,null),
  ('home-dumbbell-ppl','legs',3,'dumbbell lunge','quads',3,10,12,90,null),
  ('home-dumbbell-ppl','legs',4,'dumbbell step-up','quads',3,10,12,75,null),
  ('home-dumbbell-ppl','legs',5,'calf raise','calves',4,15,20,45,null),
  -- Bodyweight Basics
  ('bodyweight-basics','bw-a',1,'push-up','chest',3,10,20,60,null),
  ('bodyweight-basics','bw-a',2,'bodyweight squat','quads',3,15,25,60,null),
  ('bodyweight-basics','bw-a',3,'plank','core',3,30,60,45,null),
  ('bodyweight-basics','bw-a',4,'glute bridge','glutes',3,15,20,45,null),
  ('bodyweight-basics','bw-a',5,'mountain climber','cardio',3,20,30,45,null),
  ('bodyweight-basics','bw-b',1,'pike push-up','shoulders',3,8,15,60,null),
  ('bodyweight-basics','bw-b',2,'lunge','quads',3,12,15,60,null),
  ('bodyweight-basics','bw-b',3,'superman','back',3,12,15,45,null),
  ('bodyweight-basics','bw-b',4,'bicycle crunch','core',3,20,30,45,null),
  ('bodyweight-basics','bw-b',5,'wall sit','quads',3,30,60,45,null),
  ('bodyweight-basics','bw-c',1,'push-up','chest',3,12,20,60,null),
  ('bodyweight-basics','bw-c',2,'step-up','quads',3,12,15,60,null),
  ('bodyweight-basics','bw-c',3,'bird dog','core',3,10,12,45,null),
  ('bodyweight-basics','bw-c',4,'russian twist','core',3,20,30,45,null),
  ('bodyweight-basics','bw-c',5,'high knee','cardio',3,30,40,45,null),
  -- Home HIIT (one big circuit per day)
  ('home-hiit','hiit-a',1,'burpee','cardio',3,10,15,20,1),
  ('home-hiit','hiit-a',2,'jumping jack','cardio',3,30,40,20,1),
  ('home-hiit','hiit-a',3,'mountain climber','core',3,20,30,20,1),
  ('home-hiit','hiit-a',4,'bodyweight squat','quads',3,15,20,20,1),
  ('home-hiit','hiit-a',5,'high knee','cardio',3,30,40,60,1),
  ('home-hiit','hiit-b',1,'push-up','chest',3,10,20,20,1),
  ('home-hiit','hiit-b',2,'plank','core',3,30,45,20,1),
  ('home-hiit','hiit-b',3,'bicycle crunch','core',3,20,30,20,1),
  ('home-hiit','hiit-b',4,'jumping jack','cardio',3,30,40,20,1),
  ('home-hiit','hiit-b',5,'lunge','quads',3,12,15,60,1),
  ('home-hiit','hiit-c',1,'glute bridge','glutes',3,15,20,20,1),
  ('home-hiit','hiit-c',2,'mountain climber','core',3,20,30,20,1),
  ('home-hiit','hiit-c',3,'burpee','cardio',3,8,12,20,1),
  ('home-hiit','hiit-c',4,'russian twist','core',3,20,30,20,1),
  ('home-hiit','hiit-c',5,'high knee','cardio',3,30,40,60,1)
) as v(program_slug, template_slug, position, kw, muscle, sets, rep_min, rep_max, rest, superset)
join public.programs p on p.slug = v.program_slug
join public.workout_templates t on t.program_id = p.id and t.slug = v.template_slug
where public._pick_ex(v.kw, v.muscle) is not null
on conflict (workout_template_id, position) do nothing;

-- 4) Give each workout the program cover (so the dashboard hero shows a photo).
update public.workout_templates t
set cover_image_path = p.cover_image_path
from public.programs p
where t.program_id = p.id
  and (t.cover_image_path is null or t.cover_image_path like 'covers/workouts/%')
  and p.slug in ('home-dumbbell-fb','home-dumbbell-ppl','bodyweight-basics','home-hiit');
