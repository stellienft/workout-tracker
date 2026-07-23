-- Re-host ExerciseDB demo GIFs on our own storage. Their CDN blocks hotlinking
-- (browser <img> gets 403 via Referer), so we download server-side at import
-- and serve the GIF from this public bucket instead.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-gifs', 'exercise-gifs', true, 15728640, -- 15 MB
  array['image/gif', 'image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read exercise gifs" on storage.objects;
create policy "public read exercise gifs"
  on storage.objects for select
  using (bucket_id = 'exercise-gifs');

drop policy if exists "admins write exercise gifs" on storage.objects;
create policy "admins write exercise gifs"
  on storage.objects for all to authenticated
  using (bucket_id = 'exercise-gifs' and public.is_admin(auth.uid()))
  with check (bucket_id = 'exercise-gifs' and public.is_admin(auth.uid()));
