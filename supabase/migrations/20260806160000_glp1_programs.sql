-- ============================================================================
-- GLP-1 focused programs (beginner → advanced).
--
-- People on GLP-1 medication are usually in a calorie deficit with reduced
-- appetite and energy. The training priority is preserving muscle while the
-- weight comes off: resistance-led, joint-friendly, moderate volume, mostly
-- machines/dumbbells. Three tiers so members can progress as they adapt.
--
-- Exercises are keyword-matched against the imported library via _pick_ex().
-- Staging-free (inline VALUES/CTEs), idempotent (on conflict do nothing).
-- ============================================================================

-- 1) Programs
insert into public.programs
  (name, slug, short_description, fitness_goal_id, experience_level, scheduling_mode,
   duration_weeks, minimum_days_per_week, maximum_days_per_week, estimated_session_minutes,
   difficulty, status, featured, published_at, cover_image_path)
select v.name, v.slug, v.descr,
       (select id from public.fitness_goals where slug = v.goal_slug),
       v.level, 'weekly_split', v.weeks, v.min_d, v.max_d, v.minutes,
       v.level, 'published', false, now(), v.cover
from (values
  ('glp1-foundations','GLP-1 Foundations','A gentle full-body plan for your GLP-1 journey — protect muscle while you lose weight, 2–3 short days a week.','fat-loss','beginner',8,2,3,40,'https://images.pexels.com/photos/6550837/pexels-photo-6550837.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800'),
  ('glp1-recomp','GLP-1 Body Recomp','An upper/lower split to hold onto muscle and strength while the fat comes off. 3–4 days a week.','fat-loss','intermediate',8,3,4,45,'https://images.pexels.com/photos/4164759/pexels-photo-4164759.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800'),
  ('glp1-preserve','GLP-1 Muscle Preservation','A 5-day push/pull/legs + upper/lower plan to maximise muscle retention on a deficit. 4–5 days a week.','fat-loss','advanced',10,4,5,55,'https://images.pexels.com/photos/4807549/pexels-photo-4807549.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800')
) as v(slug, name, descr, goal_slug, level, weeks, min_d, max_d, minutes, cover)
on conflict (slug) do nothing;

-- 2) Workout templates
insert into public.workout_templates
  (program_id, name, slug, workout_type, week_position, estimated_minutes, difficulty, target_muscle_groups)
select p.id, v.name, v.slug, v.workout_type, v.week_position, v.minutes, v.difficulty, v.muscles
from (values
  -- Foundations (beginner): 3 full-body days
  ('glp1-foundations','fb-a','Full Body A','hypertrophy',1,40,'beginner',array['quads','chest','back']),
  ('glp1-foundations','fb-b','Full Body B','hypertrophy',2,40,'beginner',array['hamstrings','chest','shoulders']),
  ('glp1-foundations','fb-c','Full Body C','hypertrophy',3,40,'beginner',array['quads','back','glutes']),
  -- Recomp (intermediate): upper/lower x2
  ('glp1-recomp','upper-a','Upper A','hypertrophy',1,45,'intermediate',array['chest','back','shoulders']),
  ('glp1-recomp','lower-a','Lower A','hypertrophy',2,45,'intermediate',array['quads','hamstrings','calves']),
  ('glp1-recomp','upper-b','Upper B','hypertrophy',3,45,'intermediate',array['chest','back','arms']),
  ('glp1-recomp','lower-b','Lower B','hypertrophy',4,45,'intermediate',array['glutes','quads','hamstrings']),
  -- Preserve (advanced): push / pull / legs / upper / lower
  ('glp1-preserve','push','Push','hypertrophy',1,55,'advanced',array['chest','shoulders','triceps']),
  ('glp1-preserve','pull','Pull','hypertrophy',2,55,'advanced',array['back','lats','biceps']),
  ('glp1-preserve','legs','Legs','hypertrophy',3,55,'advanced',array['quads','hamstrings','calves']),
  ('glp1-preserve','upper','Upper','hypertrophy',4,55,'advanced',array['chest','back','shoulders']),
  ('glp1-preserve','lower','Lower','hypertrophy',5,55,'advanced',array['glutes','quads','hamstrings'])
) as v(program_slug, slug, name, workout_type, week_position, minutes, difficulty, muscles)
join public.programs p on p.slug = v.program_slug
on conflict (program_id, slug) do nothing;

-- 3) Template exercises
insert into public.workout_template_exercises
  (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rep_target, rest_seconds, superset_group)
select t.id,
       public._pick_ex(v.kw, v.muscle),
       v.position, v.sets, v.rep_min, v.rep_max,
       case when v.rep_min = v.rep_max then v.rep_min::text
            else v.rep_min::text || '-' || v.rep_max::text end,
       v.rest, v.superset
from (values
  -- ---- GLP-1 Foundations ----
  ('glp1-foundations','fb-a',1,'goblet squat','quads',3,10,15,90,null::int),
  ('glp1-foundations','fb-a',2,'chest press','chest',3,10,12,75,null),
  ('glp1-foundations','fb-a',3,'lat pulldown','back',3,10,12,75,null),
  ('glp1-foundations','fb-a',4,'dumbbell shoulder press','shoulders',3,10,12,75,null),
  ('glp1-foundations','fb-a',5,'leg curl','hamstrings',3,12,15,60,null),
  ('glp1-foundations','fb-a',6,'plank','core',3,30,45,45,null),
  ('glp1-foundations','fb-b',1,'leg press','quads',3,12,15,90,null),
  ('glp1-foundations','fb-b',2,'incline dumbbell press','chest',3,10,12,75,null),
  ('glp1-foundations','fb-b',3,'seated row','back',3,10,12,75,null),
  ('glp1-foundations','fb-b',4,'lateral raise','shoulders',3,12,15,60,null),
  ('glp1-foundations','fb-b',5,'romanian deadlift','hamstrings',3,10,12,90,null),
  ('glp1-foundations','fb-b',6,'glute bridge','glutes',3,12,15,45,null),
  ('glp1-foundations','fb-c',1,'dumbbell lunge','quads',3,10,12,75,null),
  ('glp1-foundations','fb-c',2,'push-up','chest',3,8,15,60,null),
  ('glp1-foundations','fb-c',3,'dumbbell row','back',3,10,12,75,null),
  ('glp1-foundations','fb-c',4,'dumbbell curl','biceps',3,10,12,60,null),
  ('glp1-foundations','fb-c',5,'triceps pushdown','triceps',3,12,15,60,null),
  ('glp1-foundations','fb-c',6,'calf raise','calves',3,15,20,45,null),
  -- ---- GLP-1 Body Recomp ----
  ('glp1-recomp','upper-a',1,'dumbbell bench press','chest',4,8,12,90,null),
  ('glp1-recomp','upper-a',2,'lat pulldown','back',4,8,12,90,null),
  ('glp1-recomp','upper-a',3,'dumbbell shoulder press','shoulders',3,8,12,75,null),
  ('glp1-recomp','upper-a',4,'seated row','back',3,10,12,75,null),
  ('glp1-recomp','upper-a',5,'lateral raise','shoulders',3,12,15,60,null),
  ('glp1-recomp','upper-a',6,'dumbbell curl','biceps',3,10,12,60,null),
  ('glp1-recomp','lower-a',1,'goblet squat','quads',4,8,12,120,null),
  ('glp1-recomp','lower-a',2,'romanian deadlift','hamstrings',4,8,12,90,null),
  ('glp1-recomp','lower-a',3,'leg press','quads',3,10,12,90,null),
  ('glp1-recomp','lower-a',4,'leg curl','hamstrings',3,12,15,60,null),
  ('glp1-recomp','lower-a',5,'calf raise','calves',4,12,20,45,null),
  ('glp1-recomp','lower-a',6,'plank','core',3,30,60,45,null),
  ('glp1-recomp','upper-b',1,'incline dumbbell press','chest',4,8,12,90,null),
  ('glp1-recomp','upper-b',2,'dumbbell row','back',4,8,12,90,null),
  ('glp1-recomp','upper-b',3,'chest press','chest',3,10,12,75,null),
  ('glp1-recomp','upper-b',4,'face pull','shoulders',3,12,20,60,null),
  ('glp1-recomp','upper-b',5,'triceps pushdown','triceps',3,10,15,60,null),
  ('glp1-recomp','upper-b',6,'hammer curl','biceps',3,10,12,60,null),
  ('glp1-recomp','lower-b',1,'leg press','quads',4,10,12,120,null),
  ('glp1-recomp','lower-b',2,'hip thrust','glutes',4,8,12,90,null),
  ('glp1-recomp','lower-b',3,'dumbbell lunge','quads',3,10,12,75,null),
  ('glp1-recomp','lower-b',4,'leg extension','quads',3,12,15,60,null),
  ('glp1-recomp','lower-b',5,'leg curl','hamstrings',3,12,15,60,null),
  ('glp1-recomp','lower-b',6,'calf raise','calves',4,15,20,45,null),
  -- ---- GLP-1 Muscle Preservation ----
  ('glp1-preserve','push',1,'dumbbell bench press','chest',4,6,10,120,null),
  ('glp1-preserve','push',2,'dumbbell shoulder press','shoulders',4,8,12,90,null),
  ('glp1-preserve','push',3,'incline dumbbell press','chest',3,8,12,75,null),
  ('glp1-preserve','push',4,'lateral raise','shoulders',4,12,20,60,null),
  ('glp1-preserve','push',5,'triceps pushdown','triceps',3,10,15,60,null),
  ('glp1-preserve','push',6,'triceps extension','triceps',3,10,15,60,null),
  ('glp1-preserve','pull',1,'lat pulldown','back',4,8,12,90,null),
  ('glp1-preserve','pull',2,'dumbbell row','back',4,8,12,90,null),
  ('glp1-preserve','pull',3,'seated row','back',3,10,12,75,null),
  ('glp1-preserve','pull',4,'face pull','shoulders',3,15,20,60,null),
  ('glp1-preserve','pull',5,'dumbbell curl','biceps',3,10,12,60,null),
  ('glp1-preserve','pull',6,'hammer curl','biceps',3,12,15,60,null),
  ('glp1-preserve','legs',1,'goblet squat','quads',4,8,12,120,null),
  ('glp1-preserve','legs',2,'romanian deadlift','hamstrings',4,8,12,120,null),
  ('glp1-preserve','legs',3,'leg press','quads',3,10,12,90,null),
  ('glp1-preserve','legs',4,'leg curl','hamstrings',3,12,15,60,null),
  ('glp1-preserve','legs',5,'leg extension','quads',3,12,15,60,null),
  ('glp1-preserve','legs',6,'calf raise','calves',4,15,20,45,null),
  ('glp1-preserve','upper',1,'chest press','chest',4,8,12,90,null),
  ('glp1-preserve','upper',2,'dumbbell row','back',4,8,12,90,null),
  ('glp1-preserve','upper',3,'dumbbell shoulder press','shoulders',3,10,12,75,null),
  ('glp1-preserve','upper',4,'lat pulldown','back',3,10,12,75,null),
  ('glp1-preserve','upper',5,'lateral raise','shoulders',3,12,20,60,null),
  ('glp1-preserve','upper',6,'dumbbell curl','biceps',3,10,15,60,null),
  ('glp1-preserve','lower',1,'leg press','quads',4,10,15,120,null),
  ('glp1-preserve','lower',2,'hip thrust','glutes',4,8,12,90,null),
  ('glp1-preserve','lower',3,'dumbbell lunge','quads',3,10,12,75,null),
  ('glp1-preserve','lower',4,'leg curl','hamstrings',3,12,15,60,null),
  ('glp1-preserve','lower',5,'calf raise','calves',4,15,20,45,null),
  ('glp1-preserve','lower',6,'plank','core',3,45,60,45,null)
) as v(program_slug, template_slug, position, kw, muscle, sets, rep_min, rep_max, rest, superset)
join public.programs p on p.slug = v.program_slug
join public.workout_templates t on t.program_id = p.id and t.slug = v.template_slug
where public._pick_ex(v.kw, v.muscle) is not null
on conflict (workout_template_id, position) do nothing;

-- 4) Give each workout the program cover so the dashboard hero shows a photo.
update public.workout_templates t
set cover_image_path = p.cover_image_path
from public.programs p
where t.program_id = p.id
  and (t.cover_image_path is null or t.cover_image_path like 'covers/workouts/%')
  and p.slug in ('glp1-foundations','glp1-recomp','glp1-preserve');
