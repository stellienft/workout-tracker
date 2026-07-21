-- Let trainers upload their own video files (not only YouTube links).
-- Files live in a public 'trainer-videos' bucket under a per-tenant folder,
-- so members can stream them; only the owning trainer can write/delete.

alter table public.trainer_videos
  add column if not exists storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trainer-videos', 'trainer-videos', true, 524288000,
  array['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read trainer videos" on storage.objects;
create policy "public read trainer videos"
  on storage.objects for select
  using (bucket_id = 'trainer-videos');

drop policy if exists "trainers upload own videos" on storage.objects;
create policy "trainers upload own videos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trainer-videos'
    and exists (
      select 1 from public.tenants t
      where t.id::text = (storage.foldername(name))[1]
        and t.owner_user_id = auth.uid()
    )
  );

drop policy if exists "trainers delete own videos" on storage.objects;
create policy "trainers delete own videos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'trainer-videos'
    and exists (
      select 1 from public.tenants t
      where t.id::text = (storage.foldername(name))[1]
        and t.owner_user_id = auth.uid()
    )
  );
