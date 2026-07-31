-- ============================================================================
-- Rebuild programs on ExerciseDB (animated GIF) exercises and archive the
-- YouTube-based library.
--
-- Approach (chosen by product):
--   * Auto-map every program-template slot to the closest GIF exercise by
--     shared primary muscle, then equipment, then category.
--   * Archive (not delete) the old YouTube exercises, so member workout history
--     and any custom splits that reference them are preserved.
--
-- Idempotent: re-running is a no-op once slots point at GIF exercises and the
-- legacy exercises are archived. A backup of the original mapping is kept in
-- public._wte_remap_backup so the remap can be reversed if needed.
-- ============================================================================

-- 0) One-time backup of the original template -> exercise mapping.
create table if not exists public._wte_remap_backup (
  wte_id uuid primary key,
  old_exercise_id uuid,
  backed_up_at timestamptz not null default now()
);
insert into public._wte_remap_backup (wte_id, old_exercise_id)
select id, exercise_id from public.workout_template_exercises
where not exists (select 1 from public._wte_remap_backup);

-- 1) Primary remap: match on shared primary muscle, then equipment overlap.
with legacy as (
  select id, primary_muscles, equipment
  from public.exercises
  where source is distinct from 'exercisedb'
),
gif as (
  select id, primary_muscles, equipment
  from public.exercises
  where source = 'exercisedb' and status = 'published'
),
ranked as (
  select
    l.id as legacy_id,
    g.id as gif_id,
    row_number() over (
      partition by l.id
      order by
        cardinality(array(select unnest(l.primary_muscles) intersect select unnest(g.primary_muscles))) desc,
        cardinality(array(select unnest(l.equipment) intersect select unnest(g.equipment))) desc,
        g.id
    ) as rn
  from legacy l
  join gif g
    on cardinality(array(select unnest(l.primary_muscles) intersect select unnest(g.primary_muscles))) > 0
)
update public.workout_template_exercises wte
set exercise_id = r.gif_id
from ranked r
where wte.exercise_id = r.legacy_id and r.rn = 1;

-- 2) Fallback: any slot still on a legacy exercise (no shared muscle in the GIF
--    library) maps to a deterministic GIF exercise of the same category.
with legacy as (
  select id, category from public.exercises where source is distinct from 'exercisedb'
),
gifcat as (
  select id, category,
    row_number() over (partition by category order by id) as rn
  from public.exercises
  where source = 'exercisedb' and status = 'published'
)
update public.workout_template_exercises wte
set exercise_id = gc.id
from legacy l
join gifcat gc on gc.category = l.category and gc.rn = 1
where wte.exercise_id = l.id;

-- 3) Archive the YouTube / legacy exercises so the library is GIF-only.
update public.exercises
set status = 'archived', updated_at = now()
where source is distinct from 'exercisedb'
  and status <> 'archived';
