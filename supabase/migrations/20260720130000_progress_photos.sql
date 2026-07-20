-- Before/after progress photos: private, per-user image tracking.
-- Photos live in a PRIVATE storage bucket and are served via short-lived
-- signed URLs — never public. Each object is stored under a folder named
-- after the owner's user id so storage RLS can scope access by path.

-- ---------- table ----------
create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  pose text not null default 'front'
    check (pose in ('front', 'side', 'back', 'other')),
  taken_on date not null default current_date,
  weight_kg numeric(5, 2),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists progress_photos_user_taken_idx
  on public.progress_photos (user_id, taken_on desc);

alter table public.progress_photos enable row level security;

drop policy if exists "own progress photos" on public.progress_photos;
create policy "own progress photos" on public.progress_photos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- private storage bucket ----------
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Access is scoped to files under a top-level folder matching the user's id,
-- e.g. "<uuid>/<photo>.jpg". Admins are intentionally NOT granted access —
-- progress photos are private to the member.
drop policy if exists "read own progress photos" on storage.objects;
create policy "read own progress photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "insert own progress photos" on storage.objects;
create policy "insert own progress photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "delete own progress photos" on storage.objects;
create policy "delete own progress photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
