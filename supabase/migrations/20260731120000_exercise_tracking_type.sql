-- How an exercise is logged: 'reps' (weight × reps, the default) or 'time'
-- (a duration — planks, holds, carries, cardio warmups). Time exercises log
-- seconds instead of a load.
alter table public.exercises
  add column if not exists tracking_type text not null default 'reps'
    check (tracking_type in ('reps', 'time'));

-- Best-effort: flag common time-based movements so existing data is sensible.
-- Admins can adjust any exercise from the exercise editor.
update public.exercises
set tracking_type = 'time'
where tracking_type = 'reps'
  and name ~* '(plank|dead ?hang|hang|wall sit|hold|carry|farmer|bike|cycl|treadmill|elliptical|erg|jump rope|skip|battle rope|mountain climb|warm.?up|\brun\b|jog|sprint|stair|isometric)';
