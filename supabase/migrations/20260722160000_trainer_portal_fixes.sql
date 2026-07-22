-- Trainer portal fixes:
--  1. Let trainers add clients by email and see their clients' names/emails.
--  2. A public image bucket so trainers can upload program cover images.

-- ============================================================
-- 1. Client lookup + reading client profiles
-- ============================================================
-- profiles RLS only exposes a user's own row, so "add client by email" failed
-- with "User not found" and client names/emails were blank in the portal.

-- Set of user ids that are clients of tenants the caller owns.
create or replace function public.my_client_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select tc.user_id
  from public.trainer_clients tc
  join public.tenants t on t.id = tc.tenant_id
  where t.owner_user_id = auth.uid();
$$;
grant execute on function public.my_client_user_ids() to authenticated;

-- Resolve a user id by exact email for the invite flow. Restricted to trainers
-- (tenant owners) and returns only the id.
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where lower(p.email) = lower(trim(p_email))
    and exists (select 1 from public.tenants t where t.owner_user_id = auth.uid())
  limit 1;
$$;
grant execute on function public.find_user_id_by_email(text) to authenticated;

-- Trainers can read the profile rows of their own clients (names/emails).
drop policy if exists "trainers read their clients profiles" on public.profiles;
create policy "trainers read their clients profiles" on public.profiles
  for select to authenticated
  using (id in (select public.my_client_user_ids()));

-- ============================================================
-- 2. Trainer media bucket (program cover images, logos)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trainer-media', 'trainer-media', true, 10485760, -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read trainer media" on storage.objects;
create policy "public read trainer media"
  on storage.objects for select
  using (bucket_id = 'trainer-media');

drop policy if exists "trainers upload own media" on storage.objects;
create policy "trainers upload own media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trainer-media'
    and exists (
      select 1 from public.tenants t
      where t.id::text = (storage.foldername(name))[1]
        and t.owner_user_id = auth.uid()
    )
  );

drop policy if exists "trainers delete own media" on storage.objects;
create policy "trainers delete own media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'trainer-media'
    and exists (
      select 1 from public.tenants t
      where t.id::text = (storage.foldername(name))[1]
        and t.owner_user_id = auth.uid()
    )
  );
