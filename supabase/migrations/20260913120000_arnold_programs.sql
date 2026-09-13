-- ============================================================================
-- Arnold Schwarzenegger programs — two of his best-documented routines from
-- "The Encyclopedia of Modern Bodybuilding":
--   1. The Golden Six      — his classic beginner full-body routine (3×/week)
--   2. The Arnold Split    — the 6-day Chest+Back / Shoulders+Arms / Legs split
--                            with his signature chest/back antagonist supersets
--
-- Exercises are matched by NAME KEYWORD against the exercise library via
-- public._pick_ex(), so this works regardless of the exercise IDs present.
-- Fully idempotent: re-running only fills gaps (on conflict do nothing) and
-- never duplicates. Every statement is self-contained (inline VALUES via CTEs)
-- so it is safe against SQL editors that run each statement separately.
-- ============================================================================

-- Exercise picker: best keyword match (muscle-preferred), else muscle-only,
-- else ANY exercise — so exercise_id is never null regardless of how the
-- exercise library is populated.
create or replace function public._pick_ex(kw text, muscle text)
returns uuid language sql stable as $$
  select coalesce(
    (select e.id from public.exercises e
       where kw is not null and e.name ilike '%'||kw||'%'
       order by (case when muscle is not null
                   and exists (select 1 from unnest(e.primary_muscles) m where lower(m)=lower(muscle))
                 then 0 else 1 end),
                (case when e.source='exercisedb' then 0 else 1 end),
                (case when e.status='published' then 0 else 1 end),
                length(e.name), e.name
       limit 1),
    (select e.id from public.exercises e
       where muscle is not null
         and exists (select 1 from unnest(e.primary_muscles) m where lower(m)=lower(muscle))
       order by (case when e.source='exercisedb' then 0 else 1 end),
                (case when e.status='published' then 0 else 1 end),
                length(e.name)
       limit 1),
    (select e.id from public.exercises e
       order by (case when e.source='exercisedb' then 0 else 1 end),
                (case when e.status='published' then 0 else 1 end),
                length(e.name)
       limit 1)
  );
$$;

-- ---------------------------------------------------------------------------
-- 1) Programs
-- ---------------------------------------------------------------------------
insert into public.programs
  (name, slug, short_description, description, experience_level, scheduling_mode,
   duration_weeks, minimum_days_per_week, maximum_days_per_week,
   estimated_session_minutes, difficulty, status, featured, published_at)
select v.name, v.slug, v.short_description, v.description, v.level, 'weekly_split',
       v.weeks, v.min_days, v.max_days, v.minutes, v.difficulty, 'published', true, now()
from (values
  ('arnold-golden-six','The Golden Six',
   'Arnold''s classic six-exercise full-body routine for building a foundation.',
   'The routine Arnold Schwarzenegger credits for building his base in his early years. Six big, basic movements trained three days a week (Mon/Wed/Fri) with heavy compound work and high effort. Simple, brutal and effective — ideal for beginners chasing size and strength.',
   'beginner',8,3,3,55,'beginner'),
  ('arnold-split-6day','The Arnold Split',
   'The legendary 6-day split: Chest & Back, Shoulders & Arms, Legs — twice a week.',
   'Arnold''s high-volume competition split, training each body part twice a week across six days. Chest and back are paired as antagonist supersets — his signature method for a massive pump — followed by a shoulders & arms day and a full legs & lower-back day. Very high volume; built for advanced lifters with recovery dialled in.',
   'advanced',8,6,6,75,'advanced')
) as v(slug, name, short_description, description, level, weeks, min_days, max_days, minutes, difficulty)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Workout templates
-- ---------------------------------------------------------------------------
insert into public.workout_templates
  (program_id, name, slug, workout_type, week_position, estimated_minutes, difficulty, target_muscle_groups)
select p.id, v.name, v.slug, v.workout_type, v.week_position, v.minutes, v.difficulty, v.muscles
from (values
  -- The Golden Six is the same full-body session three days a week.
  ('arnold-golden-six','gs-day-1','The Golden Six — Day 1','strength',1,55,'beginner',array['quads','chest','back','shoulders']),
  ('arnold-golden-six','gs-day-2','The Golden Six — Day 2','strength',2,55,'beginner',array['quads','chest','back','shoulders']),
  ('arnold-golden-six','gs-day-3','The Golden Six — Day 3','strength',3,55,'beginner',array['quads','chest','back','shoulders']),
  -- The Arnold Split — each body part twice a week.
  ('arnold-split-6day','chest-back-a','Chest & Back A','hypertrophy',1,75,'advanced',array['chest','back','lats']),
  ('arnold-split-6day','shoulders-arms-a','Shoulders & Arms A','hypertrophy',2,70,'advanced',array['shoulders','biceps','triceps']),
  ('arnold-split-6day','legs-a','Legs & Lower Back A','hypertrophy',3,80,'advanced',array['quads','hamstrings','calves']),
  ('arnold-split-6day','chest-back-b','Chest & Back B','hypertrophy',4,75,'advanced',array['chest','back','lats']),
  ('arnold-split-6day','shoulders-arms-b','Shoulders & Arms B','hypertrophy',5,70,'advanced',array['shoulders','biceps','triceps']),
  ('arnold-split-6day','legs-b','Legs & Lower Back B','hypertrophy',6,80,'advanced',array['quads','hamstrings','calves'])
) as v(program_slug, slug, name, workout_type, week_position, minutes, difficulty, muscles)
join public.programs p on p.slug = v.program_slug
on conflict (program_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- 3) Template exercises
--    (program, template, position, keyword, muscle, sets, repMin, repMax, rest, superset)
-- ---------------------------------------------------------------------------
insert into public.workout_template_exercises
  (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rep_target, rest_seconds, superset_group)
select t.id,
       public._pick_ex(v.kw, v.muscle),
       v.position, v.sets, v.rep_min, v.rep_max,
       case when v.rep_min = v.rep_max then v.rep_min::text
            else v.rep_min::text || '-' || v.rep_max::text end,
       v.rest, v.superset
from (values
  -- ===== The Golden Six (identical Mon/Wed/Fri sessions) =====
  ('arnold-golden-six','gs-day-1',1,'barbell squat','quads',4,10,10,120,null::int),
  ('arnold-golden-six','gs-day-1',2,'barbell bench press','chest',3,10,10,120,null),
  ('arnold-golden-six','gs-day-1',3,'pull-up','lats',3,8,10,90,null),
  ('arnold-golden-six','gs-day-1',4,'overhead press','shoulders',4,10,10,120,null),
  ('arnold-golden-six','gs-day-1',5,'barbell curl','biceps',3,10,10,75,null),
  ('arnold-golden-six','gs-day-1',6,'crunch','core',3,20,30,45,null),
  ('arnold-golden-six','gs-day-2',1,'barbell squat','quads',4,10,10,120,null),
  ('arnold-golden-six','gs-day-2',2,'barbell bench press','chest',3,10,10,120,null),
  ('arnold-golden-six','gs-day-2',3,'pull-up','lats',3,8,10,90,null),
  ('arnold-golden-six','gs-day-2',4,'overhead press','shoulders',4,10,10,120,null),
  ('arnold-golden-six','gs-day-2',5,'barbell curl','biceps',3,10,10,75,null),
  ('arnold-golden-six','gs-day-2',6,'crunch','core',3,20,30,45,null),
  ('arnold-golden-six','gs-day-3',1,'barbell squat','quads',4,10,10,120,null),
  ('arnold-golden-six','gs-day-3',2,'barbell bench press','chest',3,10,10,120,null),
  ('arnold-golden-six','gs-day-3',3,'pull-up','lats',3,8,10,90,null),
  ('arnold-golden-six','gs-day-3',4,'overhead press','shoulders',4,10,10,120,null),
  ('arnold-golden-six','gs-day-3',5,'barbell curl','biceps',3,10,10,75,null),
  ('arnold-golden-six','gs-day-3',6,'crunch','core',3,20,30,45,null),

  -- ===== The Arnold Split =====
  -- Chest & Back A — antagonist supersets (push paired with pull)
  ('arnold-split-6day','chest-back-a',1,'barbell bench press','chest',4,8,10,90,1),
  ('arnold-split-6day','chest-back-a',2,'pull-up','lats',4,8,10,90,1),
  ('arnold-split-6day','chest-back-a',3,'incline barbell press','chest',4,8,10,90,2),
  ('arnold-split-6day','chest-back-a',4,'barbell row','back',4,8,10,90,2),
  ('arnold-split-6day','chest-back-a',5,'chest fly','chest',3,10,12,75,3),
  ('arnold-split-6day','chest-back-a',6,'t-bar row','back',3,10,12,75,3),
  ('arnold-split-6day','chest-back-a',7,'dumbbell pullover','chest',3,12,15,60,null),

  -- Shoulders & Arms A
  ('arnold-split-6day','shoulders-arms-a',1,'overhead press','shoulders',4,8,10,120,null),
  ('arnold-split-6day','shoulders-arms-a',2,'lateral raise','shoulders',4,12,15,60,null),
  ('arnold-split-6day','shoulders-arms-a',3,'rear delt fly','shoulders',3,12,15,60,null),
  ('arnold-split-6day','shoulders-arms-a',4,'barbell curl','biceps',4,8,10,75,1),
  ('arnold-split-6day','shoulders-arms-a',5,'close grip bench press','triceps',4,8,10,75,1),
  ('arnold-split-6day','shoulders-arms-a',6,'preacher curl','biceps',3,10,12,60,2),
  ('arnold-split-6day','shoulders-arms-a',7,'triceps pushdown','triceps',3,10,12,60,2),
  ('arnold-split-6day','shoulders-arms-a',8,'wrist curl','forearms',3,15,20,45,null),

  -- Legs & Lower Back A
  ('arnold-split-6day','legs-a',1,'barbell squat','quads',5,8,12,150,null),
  ('arnold-split-6day','legs-a',2,'leg press','quads',4,10,15,120,null),
  ('arnold-split-6day','legs-a',3,'leg extension','quads',4,12,15,75,null),
  ('arnold-split-6day','legs-a',4,'lying leg curl','hamstrings',4,10,15,90,null),
  ('arnold-split-6day','legs-a',5,'romanian deadlift','hamstrings',3,8,12,120,null),
  ('arnold-split-6day','legs-a',6,'standing calf raise','calves',5,10,15,60,null),
  ('arnold-split-6day','legs-a',7,'hanging leg raise','core',4,15,20,45,null),

  -- Chest & Back B — dumbbell / cable variations + heavy deadlift
  ('arnold-split-6day','chest-back-b',1,'incline dumbbell press','chest',4,8,10,90,1),
  ('arnold-split-6day','chest-back-b',2,'lat pulldown','lats',4,10,12,90,1),
  ('arnold-split-6day','chest-back-b',3,'dumbbell bench press','chest',4,8,12,90,2),
  ('arnold-split-6day','chest-back-b',4,'seated cable row','back',4,10,12,90,2),
  ('arnold-split-6day','chest-back-b',5,'cable crossover','chest',3,12,15,60,3),
  ('arnold-split-6day','chest-back-b',6,'lat pulldown','lats',3,12,15,60,3),
  ('arnold-split-6day','chest-back-b',7,'deadlift','back',4,6,8,150,null),

  -- Shoulders & Arms B
  ('arnold-split-6day','shoulders-arms-b',1,'dumbbell shoulder press','shoulders',4,8,10,120,null),
  ('arnold-split-6day','shoulders-arms-b',2,'upright row','shoulders',3,10,12,75,null),
  ('arnold-split-6day','shoulders-arms-b',3,'lateral raise','shoulders',4,12,20,60,null),
  ('arnold-split-6day','shoulders-arms-b',4,'dumbbell curl','biceps',4,10,12,75,1),
  ('arnold-split-6day','shoulders-arms-b',5,'overhead triceps extension','triceps',4,10,12,75,1),
  ('arnold-split-6day','shoulders-arms-b',6,'hammer curl','biceps',3,12,15,60,2),
  ('arnold-split-6day','shoulders-arms-b',7,'triceps dips','triceps',3,10,12,60,2),
  ('arnold-split-6day','shoulders-arms-b',8,'concentration curl','biceps',3,12,15,45,null),

  -- Legs & Lower Back B
  ('arnold-split-6day','legs-b',1,'barbell squat','quads',5,8,12,150,null),
  ('arnold-split-6day','legs-b',2,'bulgarian split squat','quads',3,10,12,90,null),
  ('arnold-split-6day','legs-b',3,'leg extension','quads',4,15,20,60,null),
  ('arnold-split-6day','legs-b',4,'seated leg curl','hamstrings',4,12,15,75,null),
  ('arnold-split-6day','legs-b',5,'romanian deadlift','hamstrings',3,10,12,120,null),
  ('arnold-split-6day','legs-b',6,'seated calf raise','calves',5,15,20,45,null),
  ('arnold-split-6day','legs-b',7,'crunch','core',4,20,30,45,null)
) as v(program_slug, template_slug, position, kw, muscle, sets, rep_min, rep_max, rest, superset)
join public.programs p on p.slug = v.program_slug
join public.workout_templates t on t.program_id = p.id and t.slug = v.template_slug
on conflict (workout_template_id, position) do nothing;
