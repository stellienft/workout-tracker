-- ============================================================================
-- De-duplicate program exercises after the GIF remap.
--
-- The bulk YouTube->GIF remap could land the same GIF exercise in several slots
-- of one workout (many legacy exercises mapping to one GIF, plus the category
-- fallback). This keeps each slot's MUSCLE target (so a Push day stays
-- chest/shoulders/triceps, etc.) but gives every slot of the same muscle a
-- DISTINCT GIF exercise, so no workout doubles up.
--
-- Each GIF exercise is bucketed by its FIRST primary muscle only, so the same
-- exercise can never be picked for two different muscle slots in one workout.
-- Within a muscle, slots get distinct exercises (wrapping only if a muscle has
-- fewer GIF exercises than slots).
--
-- Reversible: original mapping saved to public._wte_dedup_backup.
-- Idempotent enough to re-run (it reassigns deterministically).
-- ============================================================================

create table if not exists public._wte_dedup_backup (
  wte_id uuid primary key,
  old_exercise_id uuid,
  backed_up_at timestamptz not null default now()
);
insert into public._wte_dedup_backup (wte_id, old_exercise_id)
select id, exercise_id from public.workout_template_exercises
where not exists (select 1 from public._wte_dedup_backup);

with slot as (
  -- Each slot's target muscle = the first primary muscle of its current
  -- exercise (normalising the legacy 'lats' token to 'back').
  select
    wte.id as wte_id,
    wte.workout_template_id as template_id,
    wte.position,
    case
      when lower((e.primary_muscles)[1]) = 'lats' then 'back'
      else lower((e.primary_muscles)[1])
    end as target_muscle
  from public.workout_template_exercises wte
  join public.exercises e on e.id = wte.exercise_id
  where array_length(e.primary_muscles, 1) >= 1
),
slot_ranked as (
  select *,
    row_number() over (partition by template_id, target_muscle order by position) as k
  from slot
),
gif as (
  -- Bucket each published GIF exercise by its FIRST primary muscle only, so an
  -- exercise belongs to exactly one bucket and can't collide across muscles.
  select
    e.id,
    m.muscle,
    row_number() over (partition by m.muscle order by e.name) as rn,
    count(*) over (partition by m.muscle) as cnt
  from (
    select
      id,
      case
        when lower((primary_muscles)[1]) = 'lats' then 'back'
        else lower((primary_muscles)[1])
      end as muscle,
      name
    from public.exercises
    where source = 'exercisedb'
      and status = 'published'
      and array_length(primary_muscles, 1) >= 1
  ) e
  cross join lateral (select e.muscle) as m(muscle)
)
update public.workout_template_exercises wte
set exercise_id = g.id
from slot_ranked s
join gif g
  on g.muscle = s.target_muscle
  and g.rn = ((s.k - 1) % g.cnt) + 1
where wte.id = s.wte_id;
