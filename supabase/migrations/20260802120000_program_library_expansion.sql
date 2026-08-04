-- ============================================================================
-- Program library expansion — a big variety of new programs.
--
-- Exercises are matched by NAME KEYWORD against the published GIF library
-- (source='exercisedb') via public._pick_ex(), so this works no matter what
-- exercise IDs exist in this database. Fully idempotent: re-running only fills
-- gaps (on conflict do nothing) and never duplicates.
--
-- Covers: PPL, Upper/Lower, Bro split, Full body, 5x5, Powerlifting,
-- Deadlift-only, Squat-only, Bench-only, Antagonist supersets, Arm blaster,
-- and Fat-loss circuits.
-- ============================================================================

-- Exercise picker: best keyword match (muscle-preferred), else muscle-only,
-- else any published GIF exercise (so exercise_id is never null).
create or replace function public._pick_ex(kw text, muscle text)
returns uuid language sql stable as $$
  select coalesce(
    (select e.id from public.exercises e
       where e.status='published' and e.source='exercisedb'
         and kw is not null and e.name ilike '%'||kw||'%'
       order by (case when muscle is not null
                   and exists (select 1 from unnest(e.primary_muscles) m where lower(m)=lower(muscle))
                 then 0 else 1 end), length(e.name), e.name
       limit 1),
    (select e.id from public.exercises e
       where e.status='published' and e.source='exercisedb' and muscle is not null
         and exists (select 1 from unnest(e.primary_muscles) m where lower(m)=lower(muscle))
       order by length(e.name), e.name
       limit 1),
    (select e.id from public.exercises e
       where e.status='published' and e.source='exercisedb'
       order by length(e.name) limit 1)
  );
$$;

-- ---------------------------------------------------------------------------
-- Staging tables (dropped at the end).
-- ---------------------------------------------------------------------------
create table if not exists public._seed_programs (
  slug text primary key, name text, short_description text, level text,
  weeks int, min_days int, max_days int, minutes int, difficulty text
);
create table if not exists public._seed_templates (
  program_slug text, slug text, name text, workout_type text, week_position int,
  minutes int, difficulty text, muscles text[]
);
create table if not exists public._seed_exercises (
  program_slug text, template_slug text, position int, kw text, muscle text,
  sets int, rep_min int, rep_max int, rest int, superset int
);
truncate public._seed_programs;
truncate public._seed_templates;
truncate public._seed_exercises;

-- ---------------------------------------------------------------------------
-- Programs
-- ---------------------------------------------------------------------------
insert into public._seed_programs values
('ppl-6day','Push Pull Legs (6-Day)','High-volume push/pull/legs run twice a week for serious hypertrophy.','intermediate',8,3,6,65,'intermediate'),
('upper-lower-4','Upper / Lower (4-Day)','Balanced 4-day upper/lower split — strength and size for busy weeks.','intermediate',8,4,4,60,'intermediate'),
('bro-split-5','Classic 5-Day Split','One body part a day: chest, back, shoulders, arms, legs.','intermediate',8,5,5,60,'intermediate'),
('full-body-3','Full Body Foundations (3-Day)','Simple, effective full-body training three days a week. Great for beginners.','beginner',8,3,3,50,'beginner'),
('five-by-five','5×5 Strength','The classic linear-progression barbell strength program.','beginner',12,3,3,55,'beginner'),
('powerlifting-3','Powerlifting — Squat / Bench / Deadlift','Peak the big three with heavy main lifts and targeted accessories.','advanced',10,3,4,75,'advanced'),
('deadlift-spec','Deadlift Specialization','Bring up your pull: heavy, deficit and volume deadlift days.','advanced',6,3,3,70,'advanced'),
('squat-spec','Squat Specialization','Build a bigger squat with back-squat, front-squat and volume days.','advanced',6,3,3,70,'advanced'),
('bench-spec','Bench Press Specialization','Add kilos to your bench with heavy, volume and lockout work.','advanced',6,3,3,65,'advanced'),
('antagonist-supersets','Antagonist Supersets','Time-efficient hypertrophy pairing opposing muscles back-to-back.','intermediate',6,3,4,55,'intermediate'),
('arm-blaster','Arm Blaster','Biceps & triceps supersets for maximum arm growth.','intermediate',6,2,3,45,'intermediate'),
('circuit-conditioning','Fat-Loss Circuits','Full-body circuits that keep the heart rate high and burn calories.','all',6,3,4,40,'beginner')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Workout templates
-- ---------------------------------------------------------------------------
insert into public._seed_templates values
-- PPL 6-day
('ppl-6day','push-a','Push A — Chest Focus','hypertrophy',1,65,'intermediate',array['chest','shoulders','triceps']),
('ppl-6day','pull-a','Pull A — Back Width','hypertrophy',2,65,'intermediate',array['back','lats','biceps']),
('ppl-6day','legs-a','Legs A — Quad Focus','hypertrophy',3,65,'intermediate',array['quads','glutes','calves']),
('ppl-6day','push-b','Push B — Shoulder Focus','hypertrophy',4,65,'intermediate',array['shoulders','chest','triceps']),
('ppl-6day','pull-b','Pull B — Back Thickness','hypertrophy',5,65,'intermediate',array['back','lats','biceps']),
('ppl-6day','legs-b','Legs B — Hamstring Focus','hypertrophy',6,65,'intermediate',array['hamstrings','glutes','calves']),
-- Upper/Lower
('upper-lower-4','upper-a','Upper A — Strength','strength',1,60,'intermediate',array['chest','back','shoulders']),
('upper-lower-4','lower-a','Lower A — Strength','strength',2,60,'intermediate',array['quads','hamstrings','glutes']),
('upper-lower-4','upper-b','Upper B — Hypertrophy','hypertrophy',3,60,'intermediate',array['chest','back','arms']),
('upper-lower-4','lower-b','Lower B — Hypertrophy','hypertrophy',4,60,'intermediate',array['quads','hamstrings','calves']),
-- Bro split
('bro-split-5','chest-day','Chest Day','hypertrophy',1,60,'intermediate',array['chest']),
('bro-split-5','back-day','Back Day','hypertrophy',2,60,'intermediate',array['back','lats']),
('bro-split-5','shoulder-day','Shoulder Day','hypertrophy',3,60,'intermediate',array['shoulders']),
('bro-split-5','arm-day','Arm Day','hypertrophy',4,55,'intermediate',array['biceps','triceps']),
('bro-split-5','leg-day','Leg Day','hypertrophy',5,65,'intermediate',array['quads','hamstrings','glutes']),
-- Full body 3
('full-body-3','fb-a','Full Body A','strength',1,50,'beginner',array['chest','back','quads']),
('full-body-3','fb-b','Full Body B','strength',2,50,'beginner',array['shoulders','hamstrings','back']),
('full-body-3','fb-c','Full Body C','strength',3,50,'beginner',array['chest','quads','back']),
-- 5x5
('five-by-five','wk-a','Workout A','strength',1,55,'beginner',array['quads','chest','back']),
('five-by-five','wk-b','Workout B','strength',2,55,'beginner',array['quads','shoulders','back']),
-- Powerlifting
('powerlifting-3','squat-day','Squat Day','strength',1,75,'advanced',array['quads','glutes']),
('powerlifting-3','bench-day','Bench Day','strength',2,75,'advanced',array['chest','triceps','shoulders']),
('powerlifting-3','deadlift-day','Deadlift Day','strength',3,75,'advanced',array['back','hamstrings','glutes']),
-- Deadlift spec
('deadlift-spec','dl-heavy','Heavy Deadlift','strength',1,70,'advanced',array['back','hamstrings','glutes']),
('deadlift-spec','dl-deficit','Deficit & RDL','strength',2,70,'advanced',array['hamstrings','back','glutes']),
('deadlift-spec','dl-volume','Volume Pulls','hypertrophy',3,70,'advanced',array['back','hamstrings']),
-- Squat spec
('squat-spec','sq-heavy','Heavy Back Squat','strength',1,70,'advanced',array['quads','glutes']),
('squat-spec','sq-front','Front Squat & Tempo','strength',2,70,'advanced',array['quads','glutes']),
('squat-spec','sq-volume','Volume Squats','hypertrophy',3,70,'advanced',array['quads','hamstrings']),
-- Bench spec
('bench-spec','bp-heavy','Heavy Bench','strength',1,65,'advanced',array['chest','triceps']),
('bench-spec','bp-volume','Volume Bench','hypertrophy',2,65,'advanced',array['chest','shoulders']),
('bench-spec','bp-lockout','Lockout & Triceps','strength',3,65,'advanced',array['triceps','chest']),
-- Antagonist supersets
('antagonist-supersets','as-upper','Upper Supersets','hypertrophy',1,55,'intermediate',array['chest','back','arms']),
('antagonist-supersets','as-lower','Lower Supersets','hypertrophy',2,55,'intermediate',array['quads','hamstrings','calves']),
('antagonist-supersets','as-full','Full-Body Supersets','hypertrophy',3,55,'intermediate',array['shoulders','back','arms']),
-- Arm blaster
('arm-blaster','ab-a','Arms A','hypertrophy',1,45,'intermediate',array['biceps','triceps']),
('arm-blaster','ab-b','Arms B','hypertrophy',2,45,'intermediate',array['biceps','triceps']),
-- Circuits
('circuit-conditioning','cc-a','Circuit A','conditioning',1,40,'beginner',array['quads','chest','back']),
('circuit-conditioning','cc-b','Circuit B','conditioning',2,40,'beginner',array['glutes','shoulders','core']),
('circuit-conditioning','cc-c','Circuit C','conditioning',3,40,'beginner',array['hamstrings','back','core'])
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Template exercises  (program, template, position, keyword, muscle, sets, repMin, repMax, rest, superset)
-- ---------------------------------------------------------------------------
insert into public._seed_exercises values
-- ===== PPL: Push A =====
('ppl-6day','push-a',1,'barbell bench press','chest',4,6,8,150,null),
('ppl-6day','push-a',2,'incline dumbbell press','chest',3,8,12,120,null),
('ppl-6day','push-a',3,'chest fly','chest',3,10,15,90,null),
('ppl-6day','push-a',4,'dumbbell shoulder press','shoulders',3,8,12,120,null),
('ppl-6day','push-a',5,'lateral raise','shoulders',3,12,20,60,null),
('ppl-6day','push-a',6,'triceps pushdown','triceps',3,10,15,75,null),
-- Pull A
('ppl-6day','pull-a',1,'pull-up','lats',4,6,10,120,null),
('ppl-6day','pull-a',2,'lat pulldown','lats',3,10,12,90,null),
('ppl-6day','pull-a',3,'seated cable row','back',3,10,12,90,null),
('ppl-6day','pull-a',4,'face pull','shoulders',3,15,20,60,null),
('ppl-6day','pull-a',5,'barbell curl','biceps',3,8,12,75,null),
('ppl-6day','pull-a',6,'hammer curl','biceps',3,10,15,60,null),
-- Legs A
('ppl-6day','legs-a',1,'barbell squat','quads',4,6,8,180,null),
('ppl-6day','legs-a',2,'leg press','quads',3,10,15,120,null),
('ppl-6day','legs-a',3,'leg extension','quads',3,12,15,75,null),
('ppl-6day','legs-a',4,'romanian deadlift','hamstrings',3,8,12,120,null),
('ppl-6day','legs-a',5,'standing calf raise','calves',4,12,20,60,null),
-- Push B
('ppl-6day','push-b',1,'overhead press','shoulders',4,6,8,150,null),
('ppl-6day','push-b',2,'incline barbell press','chest',3,8,10,120,null),
('ppl-6day','push-b',3,'dumbbell bench press','chest',3,10,12,90,null),
('ppl-6day','push-b',4,'lateral raise','shoulders',4,12,20,60,null),
('ppl-6day','push-b',5,'overhead triceps extension','triceps',3,10,15,75,null),
('ppl-6day','push-b',6,'triceps dips','triceps',3,8,12,90,null),
-- Pull B
('ppl-6day','pull-b',1,'barbell row','back',4,6,10,150,null),
('ppl-6day','pull-b',2,'t-bar row','back',3,8,12,120,null),
('ppl-6day','pull-b',3,'lat pulldown','lats',3,10,12,90,null),
('ppl-6day','pull-b',4,'rear delt fly','shoulders',3,15,20,60,null),
('ppl-6day','pull-b',5,'preacher curl','biceps',3,8,12,75,null),
('ppl-6day','pull-b',6,'cable curl','biceps',3,12,15,60,null),
-- Legs B
('ppl-6day','legs-b',1,'romanian deadlift','hamstrings',4,6,10,150,null),
('ppl-6day','legs-b',2,'lying leg curl','hamstrings',3,10,15,90,null),
('ppl-6day','legs-b',3,'hip thrust','glutes',3,8,12,120,null),
('ppl-6day','legs-b',4,'bulgarian split squat','quads',3,10,12,90,null),
('ppl-6day','legs-b',5,'seated calf raise','calves',4,12,20,60,null),
-- ===== Upper/Lower =====
('upper-lower-4','upper-a',1,'barbell bench press','chest',4,5,6,180,null),
('upper-lower-4','upper-a',2,'barbell row','back',4,6,8,150,null),
('upper-lower-4','upper-a',3,'overhead press','shoulders',3,6,8,120,null),
('upper-lower-4','upper-a',4,'lat pulldown','lats',3,8,10,90,null),
('upper-lower-4','upper-a',5,'barbell curl','biceps',3,8,12,75,null),
('upper-lower-4','upper-a',6,'triceps pushdown','triceps',3,8,12,75,null),
('upper-lower-4','lower-a',1,'barbell squat','quads',4,5,6,180,null),
('upper-lower-4','lower-a',2,'romanian deadlift','hamstrings',3,6,8,150,null),
('upper-lower-4','lower-a',3,'leg press','quads',3,10,12,120,null),
('upper-lower-4','lower-a',4,'lying leg curl','hamstrings',3,10,12,90,null),
('upper-lower-4','lower-a',5,'standing calf raise','calves',4,12,15,60,null),
('upper-lower-4','upper-b',1,'incline dumbbell press','chest',4,8,12,120,null),
('upper-lower-4','upper-b',2,'seated cable row','back',4,10,12,90,null),
('upper-lower-4','upper-b',3,'lateral raise','shoulders',4,12,20,60,null),
('upper-lower-4','upper-b',4,'pull-up','lats',3,8,12,90,null),
('upper-lower-4','upper-b',5,'hammer curl','biceps',3,10,15,60,null),
('upper-lower-4','upper-b',6,'overhead triceps extension','triceps',3,10,15,60,null),
('upper-lower-4','lower-b',1,'front squat','quads',4,8,10,150,null),
('upper-lower-4','lower-b',2,'hip thrust','glutes',3,10,12,90,null),
('upper-lower-4','lower-b',3,'leg extension','quads',3,12,15,75,null),
('upper-lower-4','lower-b',4,'seated leg curl','hamstrings',3,12,15,75,null),
('upper-lower-4','lower-b',5,'seated calf raise','calves',4,15,20,45,null),
-- ===== Bro split =====
('bro-split-5','chest-day',1,'barbell bench press','chest',4,6,10,150,null),
('bro-split-5','chest-day',2,'incline dumbbell press','chest',4,8,12,120,null),
('bro-split-5','chest-day',3,'chest fly','chest',3,12,15,75,null),
('bro-split-5','chest-day',4,'cable crossover','chest',3,12,20,60,null),
('bro-split-5','chest-day',5,'push-up','chest',3,15,25,60,null),
('bro-split-5','back-day',1,'deadlift','back',4,5,8,180,null),
('bro-split-5','back-day',2,'pull-up','lats',4,6,12,120,null),
('bro-split-5','back-day',3,'barbell row','back',4,8,10,120,null),
('bro-split-5','back-day',4,'lat pulldown','lats',3,10,12,90,null),
('bro-split-5','back-day',5,'seated cable row','back',3,12,15,75,null),
('bro-split-5','shoulder-day',1,'overhead press','shoulders',4,6,10,150,null),
('bro-split-5','shoulder-day',2,'dumbbell shoulder press','shoulders',3,8,12,120,null),
('bro-split-5','shoulder-day',3,'lateral raise','shoulders',4,12,20,60,null),
('bro-split-5','shoulder-day',4,'rear delt fly','shoulders',3,15,20,60,null),
('bro-split-5','shoulder-day',5,'upright row','shoulders',3,10,15,75,null),
('bro-split-5','arm-day',1,'barbell curl','biceps',4,8,12,75,null),
('bro-split-5','arm-day',2,'close grip bench press','triceps',4,8,12,90,null),
('bro-split-5','arm-day',3,'preacher curl','biceps',3,10,12,60,null),
('bro-split-5','arm-day',4,'triceps pushdown','triceps',3,10,15,60,null),
('bro-split-5','arm-day',5,'hammer curl','biceps',3,12,15,60,null),
('bro-split-5','arm-day',6,'overhead triceps extension','triceps',3,12,15,60,null),
('bro-split-5','leg-day',1,'barbell squat','quads',4,6,10,180,null),
('bro-split-5','leg-day',2,'leg press','quads',4,10,15,120,null),
('bro-split-5','leg-day',3,'romanian deadlift','hamstrings',3,8,12,120,null),
('bro-split-5','leg-day',4,'leg extension','quads',3,12,15,75,null),
('bro-split-5','leg-day',5,'lying leg curl','hamstrings',3,12,15,75,null),
('bro-split-5','leg-day',6,'standing calf raise','calves',4,15,20,45,null),
-- ===== Full body 3 =====
('full-body-3','fb-a',1,'barbell squat','quads',3,8,10,120,null),
('full-body-3','fb-a',2,'barbell bench press','chest',3,8,10,120,null),
('full-body-3','fb-a',3,'barbell row','back',3,8,10,120,null),
('full-body-3','fb-a',4,'lateral raise','shoulders',3,12,15,60,null),
('full-body-3','fb-a',5,'plank','core',3,30,60,45,null),
('full-body-3','fb-b',1,'romanian deadlift','hamstrings',3,8,10,120,null),
('full-body-3','fb-b',2,'overhead press','shoulders',3,8,10,120,null),
('full-body-3','fb-b',3,'lat pulldown','lats',3,10,12,90,null),
('full-body-3','fb-b',4,'leg press','quads',3,12,15,90,null),
('full-body-3','fb-b',5,'barbell curl','biceps',3,10,12,60,null),
('full-body-3','fb-c',1,'leg press','quads',3,10,12,120,null),
('full-body-3','fb-c',2,'incline dumbbell press','chest',3,8,12,120,null),
('full-body-3','fb-c',3,'seated cable row','back',3,10,12,90,null),
('full-body-3','fb-c',4,'triceps pushdown','triceps',3,10,15,60,null),
('full-body-3','fb-c',5,'hanging leg raise','core',3,10,15,60,null),
-- ===== 5x5 =====
('five-by-five','wk-a',1,'barbell squat','quads',5,5,5,180,null),
('five-by-five','wk-a',2,'barbell bench press','chest',5,5,5,180,null),
('five-by-five','wk-a',3,'barbell row','back',5,5,5,150,null),
('five-by-five','wk-b',1,'barbell squat','quads',5,5,5,180,null),
('five-by-five','wk-b',2,'overhead press','shoulders',5,5,5,180,null),
('five-by-five','wk-b',3,'deadlift','back',1,5,5,240,null),
-- ===== Powerlifting =====
('powerlifting-3','squat-day',1,'barbell squat','quads',5,3,5,240,null),
('powerlifting-3','squat-day',2,'front squat','quads',3,5,6,180,null),
('powerlifting-3','squat-day',3,'leg press','quads',3,8,10,120,null),
('powerlifting-3','squat-day',4,'lying leg curl','hamstrings',3,10,12,90,null),
('powerlifting-3','squat-day',5,'standing calf raise','calves',4,12,15,60,null),
('powerlifting-3','bench-day',1,'barbell bench press','chest',5,3,5,240,null),
('powerlifting-3','bench-day',2,'close grip bench press','triceps',3,6,8,150,null),
('powerlifting-3','bench-day',3,'incline dumbbell press','chest',3,8,10,120,null),
('powerlifting-3','bench-day',4,'lateral raise','shoulders',3,12,15,60,null),
('powerlifting-3','bench-day',5,'triceps pushdown','triceps',3,10,12,75,null),
('powerlifting-3','deadlift-day',1,'deadlift','back',5,3,5,240,null),
('powerlifting-3','deadlift-day',2,'romanian deadlift','hamstrings',3,6,8,180,null),
('powerlifting-3','deadlift-day',3,'barbell row','back',3,8,10,120,null),
('powerlifting-3','deadlift-day',4,'lat pulldown','lats',3,10,12,90,null),
('powerlifting-3','deadlift-day',5,'hanging leg raise','core',3,10,15,60,null),
-- ===== Deadlift spec =====
('deadlift-spec','dl-heavy',1,'deadlift','back',6,2,4,240,null),
('deadlift-spec','dl-heavy',2,'barbell row','back',4,6,8,150,null),
('deadlift-spec','dl-heavy',3,'lat pulldown','lats',3,10,12,90,null),
('deadlift-spec','dl-heavy',4,'hanging leg raise','core',3,10,15,60,null),
('deadlift-spec','dl-deficit',1,'romanian deadlift','hamstrings',5,5,8,180,null),
('deadlift-spec','dl-deficit',2,'hip thrust','glutes',4,8,12,120,null),
('deadlift-spec','dl-deficit',3,'lying leg curl','hamstrings',4,10,12,90,null),
('deadlift-spec','dl-deficit',4,'back extension','back',3,12,15,75,null),
('deadlift-spec','dl-volume',1,'deadlift','back',5,5,8,180,null),
('deadlift-spec','dl-volume',2,'t-bar row','back',4,8,10,120,null),
('deadlift-spec','dl-volume',3,'seated cable row','back',3,10,12,90,null),
('deadlift-spec','dl-volume',4,'barbell shrug','back',4,12,15,60,null),
-- ===== Squat spec =====
('squat-spec','sq-heavy',1,'barbell squat','quads',6,2,4,240,null),
('squat-spec','sq-heavy',2,'leg press','quads',4,8,10,120,null),
('squat-spec','sq-heavy',3,'lying leg curl','hamstrings',3,10,12,90,null),
('squat-spec','sq-heavy',4,'standing calf raise','calves',4,12,15,60,null),
('squat-spec','sq-front',1,'front squat','quads',5,5,6,180,null),
('squat-spec','sq-front',2,'bulgarian split squat','quads',3,8,10,90,null),
('squat-spec','sq-front',3,'romanian deadlift','hamstrings',3,8,10,120,null),
('squat-spec','sq-front',4,'leg extension','quads',3,12,15,75,null),
('squat-spec','sq-volume',1,'barbell squat','quads',5,8,10,150,null),
('squat-spec','sq-volume',2,'hack squat','quads',4,10,12,120,null),
('squat-spec','sq-volume',3,'walking lunge','quads',3,12,15,90,null),
('squat-spec','sq-volume',4,'seated calf raise','calves',4,15,20,45,null),
-- ===== Bench spec =====
('bench-spec','bp-heavy',1,'barbell bench press','chest',6,2,4,240,null),
('bench-spec','bp-heavy',2,'incline barbell press','chest',4,5,6,150,null),
('bench-spec','bp-heavy',3,'overhead press','shoulders',3,6,8,120,null),
('bench-spec','bp-heavy',4,'triceps pushdown','triceps',3,10,12,75,null),
('bench-spec','bp-volume',1,'barbell bench press','chest',5,8,10,150,null),
('bench-spec','bp-volume',2,'dumbbell bench press','chest',4,10,12,120,null),
('bench-spec','bp-volume',3,'chest fly','chest',3,12,15,75,null),
('bench-spec','bp-volume',4,'lateral raise','shoulders',3,12,20,60,null),
('bench-spec','bp-lockout',1,'close grip bench press','triceps',5,5,8,150,null),
('bench-spec','bp-lockout',2,'overhead triceps extension','triceps',4,8,12,90,null),
('bench-spec','bp-lockout',3,'triceps dips','triceps',3,8,12,90,null),
('bench-spec','bp-lockout',4,'incline dumbbell press','chest',3,10,12,90,null),
-- ===== Antagonist supersets (grouped) =====
('antagonist-supersets','as-upper',1,'barbell bench press','chest',4,8,10,90,1),
('antagonist-supersets','as-upper',2,'barbell row','back',4,8,10,90,1),
('antagonist-supersets','as-upper',3,'incline dumbbell press','chest',3,10,12,75,2),
('antagonist-supersets','as-upper',4,'lat pulldown','lats',3,10,12,75,2),
('antagonist-supersets','as-upper',5,'barbell curl','biceps',3,10,12,60,3),
('antagonist-supersets','as-upper',6,'triceps pushdown','triceps',3,10,12,60,3),
('antagonist-supersets','as-lower',1,'leg extension','quads',4,12,15,75,1),
('antagonist-supersets','as-lower',2,'lying leg curl','hamstrings',4,12,15,75,1),
('antagonist-supersets','as-lower',3,'leg press','quads',3,12,15,90,2),
('antagonist-supersets','as-lower',4,'romanian deadlift','hamstrings',3,10,12,90,2),
('antagonist-supersets','as-lower',5,'standing calf raise','calves',4,15,20,45,null),
('antagonist-supersets','as-full',1,'overhead press','shoulders',4,8,12,75,1),
('antagonist-supersets','as-full',2,'lat pulldown','lats',4,10,12,75,1),
('antagonist-supersets','as-full',3,'lateral raise','shoulders',3,15,20,60,2),
('antagonist-supersets','as-full',4,'face pull','shoulders',3,15,20,60,2),
('antagonist-supersets','as-full',5,'barbell curl','biceps',3,10,12,60,3),
('antagonist-supersets','as-full',6,'overhead triceps extension','triceps',3,10,12,60,3),
-- ===== Arm blaster (grouped) =====
('arm-blaster','ab-a',1,'barbell curl','biceps',4,8,12,60,1),
('arm-blaster','ab-a',2,'close grip bench press','triceps',4,8,12,60,1),
('arm-blaster','ab-a',3,'preacher curl','biceps',3,10,12,60,2),
('arm-blaster','ab-a',4,'triceps pushdown','triceps',3,10,12,60,2),
('arm-blaster','ab-a',5,'hammer curl','biceps',3,12,15,60,3),
('arm-blaster','ab-a',6,'overhead triceps extension','triceps',3,12,15,60,3),
('arm-blaster','ab-b',1,'incline dumbbell curl','biceps',4,10,12,60,1),
('arm-blaster','ab-b',2,'triceps dips','triceps',4,8,12,60,1),
('arm-blaster','ab-b',3,'cable curl','biceps',3,12,15,60,2),
('arm-blaster','ab-b',4,'skull crusher','triceps',3,10,12,60,2),
('arm-blaster','ab-b',5,'concentration curl','biceps',3,12,15,45,3),
('arm-blaster','ab-b',6,'triceps kickback','triceps',3,12,15,45,3),
-- ===== Circuits (grouped as one big circuit each) =====
('circuit-conditioning','cc-a',1,'goblet squat','quads',3,15,20,30,1),
('circuit-conditioning','cc-a',2,'push-up','chest',3,10,20,30,1),
('circuit-conditioning','cc-a',3,'dumbbell row','back',3,12,15,30,1),
('circuit-conditioning','cc-a',4,'mountain climber','core',3,20,30,30,1),
('circuit-conditioning','cc-a',5,'plank','core',3,30,45,60,1),
('circuit-conditioning','cc-b',1,'hip thrust','glutes',3,15,20,30,1),
('circuit-conditioning','cc-b',2,'dumbbell shoulder press','shoulders',3,12,15,30,1),
('circuit-conditioning','cc-b',3,'jumping jack','cardio',3,30,40,30,1),
('circuit-conditioning','cc-b',4,'russian twist','core',3,20,30,30,1),
('circuit-conditioning','cc-b',5,'burpee','cardio',3,8,12,60,1),
('circuit-conditioning','cc-c',1,'romanian deadlift','hamstrings',3,15,20,30,1),
('circuit-conditioning','cc-c',2,'lat pulldown','lats',3,12,15,30,1),
('circuit-conditioning','cc-c',3,'kettlebell swing','glutes',3,15,20,30,1),
('circuit-conditioning','cc-c',4,'bicycle crunch','core',3,20,30,30,1),
('circuit-conditioning','cc-c',5,'high knees','cardio',3,30,40,60,1)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Materialise into the real tables
-- ---------------------------------------------------------------------------
insert into public.programs
  (name, slug, short_description, experience_level, scheduling_mode, duration_weeks,
   minimum_days_per_week, maximum_days_per_week, estimated_session_minutes, difficulty,
   status, featured, published_at)
select name, slug, short_description, level, 'weekly_split', weeks,
       min_days, max_days, minutes, difficulty, 'published', false, now()
from public._seed_programs
on conflict (slug) do nothing;

insert into public.workout_templates
  (program_id, name, slug, workout_type, week_position, estimated_minutes, difficulty, target_muscle_groups)
select p.id, s.name, s.slug, s.workout_type, s.week_position, s.minutes, s.difficulty, s.muscles
from public._seed_templates s
join public.programs p on p.slug = s.program_slug
on conflict (program_id, slug) do nothing;

insert into public.workout_template_exercises
  (workout_template_id, exercise_id, position, sets, rep_min, rep_max, rep_target, rest_seconds, superset_group)
select t.id,
       public._pick_ex(e.kw, e.muscle),
       e.position, e.sets, e.rep_min, e.rep_max,
       case when e.rep_min = e.rep_max then e.rep_min::text
            else e.rep_min::text || '-' || e.rep_max::text end,
       e.rest, e.superset
from public._seed_exercises e
join public.programs p on p.slug = e.program_slug
join public.workout_templates t on t.program_id = p.id and t.slug = e.template_slug
on conflict (workout_template_id, position) do nothing;

-- ---------------------------------------------------------------------------
-- Clean up staging.
-- ---------------------------------------------------------------------------
drop table if exists public._seed_exercises;
drop table if exists public._seed_templates;
drop table if exists public._seed_programs;
