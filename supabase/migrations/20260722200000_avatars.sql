-- Profile avatars. profiles.avatar_url already exists; this adds a public
-- bucket where each user can manage only their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read avatars" on storage.objects;
create policy "public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "users manage own avatar" on storage.objects;
create policy "users manage own avatar"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
