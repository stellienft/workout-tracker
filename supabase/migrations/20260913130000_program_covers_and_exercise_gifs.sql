-- Covers + GIFs housekeeping (idempotent, safe to re-run and safe on a fresh
-- database — it simply matches fewer/no rows until the data + storage objects
-- exist).
--   1. Give the Arnold programs (and their workouts) real cover photos.
--   2. Back-fill any published ExerciseDB exercise whose animated GIF was
--      already uploaded to the `exercise-gifs` storage bucket but whose
--      cover_image_path was never pointed at it.

-- 1) Arnold program covers (licence-safe gym photography, not the man himself).
update public.programs p set cover_image_path = c.url
from (values
  ('arnold-golden-six','https://images.pexels.com/photos/1552106/pexels-photo-1552106.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800'),
  ('arnold-split-6day','https://images.pexels.com/photos/18091037/pexels-photo-18091037.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800')
) as c(slug, url)
where p.slug = c.slug
  and (p.cover_image_path is null or p.cover_image_path = '');

update public.workout_templates t
set cover_image_path = p.cover_image_path
from public.programs p
where t.program_id = p.id
  and p.slug in ('arnold-golden-six','arnold-split-6day')
  and (t.cover_image_path is null or t.cover_image_path = '');

-- 2) Back-fill exercise GIFs from the storage bucket. The public URL prefix is
--    derived from an already-hosted cover so this stays portable across
--    environments (no hard-coded project ref).
with base as (
  select regexp_replace(
           cover_image_path,
           '(/storage/v1/object/public/exercise-gifs/).*$', '\1'
         ) as prefix
  from public.exercises
  where cover_image_path like '%/storage/v1/object/public/exercise-gifs/%'
  limit 1
)
update public.exercises e
set cover_image_path =
      (select prefix from base) || replace(e.external_id, ':', '_') || '.gif',
    updated_at = now()
from storage.objects o, base
where e.status = 'published'
  and (e.cover_image_path is null or e.cover_image_path = '')
  and e.external_id is not null
  and o.bucket_id = 'exercise-gifs'
  and o.name = replace(e.external_id, ':', '_') || '.gif'
  and base.prefix is not null;
