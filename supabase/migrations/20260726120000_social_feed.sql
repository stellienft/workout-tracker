-- ============================================================
-- Social feed: posts, comments, reactions, follows, blocks, reports
-- plus the social-feed storage bucket and RLS policies.
-- Idempotent: uses create table if not exists / drop policy if exists.
-- ============================================================

-- ============================================================
-- Helper: is_pro_user(uid)
-- True if the user is an admin, has an active pro subscription,
-- or has an unexpired free grant. SECURITY DEFINER so it can read
-- the subscriptions / free_grants tables which are otherwise
-- owner-only under RLS.
-- ============================================================
create or replace function public.is_pro_user(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin(uid)
    or exists (
      select 1
      from public.subscriptions s
      where s.user_id = uid
        and s.plan = 'pro'
        and s.status = 'active'
    )
    or exists (
      select 1
      from public.free_grants fg
      where fg.user_id = uid
        and fg.pro_until >= now()
    );
$$;

revoke execute on function public.is_pro_user(uuid) from anon, public;
grant execute on function public.is_pro_user(uuid) to authenticated;

-- ============================================================
-- Create ALL tables first (before any policies that reference them)
-- ============================================================

-- 1. social_posts
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  caption text check (char_length(caption) <= 2000),
  media_url text,
  media_type text not null default 'none' check (media_type in ('image','video','none')),
  workout_session_id uuid references public.workout_sessions (id) on delete set null,
  ai_moderation_status text not null default 'pending'
    check (ai_moderation_status in ('pending','approved','flagged','rejected')),
  ai_moderation_note text,
  created_at timestamptz not null default now()
);
create index if not exists social_posts_user_idx on public.social_posts (user_id);
create index if not exists social_posts_created_at_idx on public.social_posts (created_at desc);

-- 2. social_comments
create table if not exists public.social_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists social_comments_post_idx on public.social_comments (post_id, created_at);

-- 3. social_reactions
create table if not exists public.social_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('🔥','💪','❤️','👏','🤯')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);

-- 4. social_follows
create table if not exists public.social_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

-- 5. social_blocks (MUST exist before social_posts policies reference it)
create table if not exists public.social_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- 6. social_reports
create table if not exists public.social_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid references public.social_posts (id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','nsfw','misinformation','other')),
  detail text check (char_length(detail) <= 500),
  status text not null default 'pending' check (status in ('pending','reviewed','actioned')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
alter table public.social_posts enable row level security;
alter table public.social_comments enable row level security;
alter table public.social_reactions enable row level security;
alter table public.social_follows enable row level security;
alter table public.social_blocks enable row level security;
alter table public.social_reports enable row level security;

-- ============================================================
-- ALL policies (tables all exist now, so cross-table refs are safe)
-- ============================================================

-- social_posts: SELECT (blocked users can't see)
drop policy if exists "social_posts select" on public.social_posts;
create policy "social_posts select"
  on public.social_posts for select to authenticated
  using (
    not exists (
      select 1 from public.social_blocks sb
      where sb.blocker_id = social_posts.user_id
        and sb.blocked_id = auth.uid()
    )
  );

-- social_posts: INSERT (pro users only)
drop policy if exists "social_posts insert" on public.social_posts;
create policy "social_posts insert"
  on public.social_posts for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_pro_user(auth.uid())
  );

-- social_posts: UPDATE (own only)
drop policy if exists "social_posts update" on public.social_posts;
create policy "social_posts update"
  on public.social_posts for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- social_posts: DELETE (own only)
drop policy if exists "social_posts delete" on public.social_posts;
create policy "social_posts delete"
  on public.social_posts for delete to authenticated
  using (user_id = auth.uid());

-- social_comments: SELECT (blocked users can't see)
drop policy if exists "social_comments select" on public.social_comments;
create policy "social_comments select"
  on public.social_comments for select to authenticated
  using (
    not exists (
      select 1 from public.social_blocks sb
      where sb.blocker_id = social_comments.user_id
        and sb.blocked_id = auth.uid()
    )
    and not exists (
      select 1
      from public.social_blocks sb
      join public.social_posts sp on sp.id = social_comments.post_id
      where sb.blocker_id = sp.user_id
        and sb.blocked_id = auth.uid()
    )
  );

-- social_comments: INSERT (pro users only)
drop policy if exists "social_comments insert" on public.social_comments;
create policy "social_comments insert"
  on public.social_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_pro_user(auth.uid())
  );

-- social_comments: DELETE (own only)
drop policy if exists "social_comments delete" on public.social_comments;
create policy "social_comments delete"
  on public.social_comments for delete to authenticated
  using (user_id = auth.uid());

-- social_reactions: SELECT (authenticated)
drop policy if exists "social_reactions select" on public.social_reactions;
create policy "social_reactions select"
  on public.social_reactions for select to authenticated
  using (true);

-- social_reactions: INSERT (pro users only)
drop policy if exists "social_reactions insert" on public.social_reactions;
create policy "social_reactions insert"
  on public.social_reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_pro_user(auth.uid())
  );

-- social_reactions: DELETE (pro users, own only)
drop policy if exists "social_reactions delete" on public.social_reactions;
create policy "social_reactions delete"
  on public.social_reactions for delete to authenticated
  using (
    user_id = auth.uid()
    and public.is_pro_user(auth.uid())
  );

-- social_follows: SELECT (either party)
drop policy if exists "social_follows select" on public.social_follows;
create policy "social_follows select"
  on public.social_follows for select to authenticated
  using (follower_id = auth.uid() or following_id = auth.uid());

-- social_follows: INSERT (pro users, own follower_id)
drop policy if exists "social_follows insert" on public.social_follows;
create policy "social_follows insert"
  on public.social_follows for insert to authenticated
  with check (
    follower_id = auth.uid()
    and public.is_pro_user(auth.uid())
  );

-- social_follows: DELETE (pro users, own follower_id)
drop policy if exists "social_follows delete" on public.social_follows;
create policy "social_follows delete"
  on public.social_follows for delete to authenticated
  using (
    follower_id = auth.uid()
    and public.is_pro_user(auth.uid())
  );

-- social_blocks: SELECT (own only)
drop policy if exists "social_blocks select" on public.social_blocks;
create policy "social_blocks select"
  on public.social_blocks for select to authenticated
  using (blocker_id = auth.uid());

-- social_blocks: INSERT (own only)
drop policy if exists "social_blocks insert" on public.social_blocks;
create policy "social_blocks insert"
  on public.social_blocks for insert to authenticated
  with check (blocker_id = auth.uid());

-- social_blocks: DELETE (own only)
drop policy if exists "social_blocks delete" on public.social_blocks;
create policy "social_blocks delete"
  on public.social_blocks for delete to authenticated
  using (blocker_id = auth.uid());

-- social_reports: SELECT (admin only)
drop policy if exists "social_reports select" on public.social_reports;
create policy "social_reports select"
  on public.social_reports for select to authenticated
  using (public.is_admin());

-- social_reports: INSERT (any authenticated user)
drop policy if exists "social_reports insert" on public.social_reports;
create policy "social_reports insert"
  on public.social_reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- social_reports: DELETE (admin only)
drop policy if exists "social_reports delete" on public.social_reports;
create policy "social_reports delete"
  on public.social_reports for delete to authenticated
  using (public.is_admin());

-- ============================================================
-- Storage bucket: social-feed (private — signed URLs only)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'social-feed', 'social-feed', false, 52428800, -- 50 MB
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage INSERT: authenticated pro users, to their own folder only
drop policy if exists "social-feed insert" on storage.objects;
create policy "social-feed insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'social-feed'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_pro_user(auth.uid())
  );

-- Storage DELETE: own objects or admin
drop policy if exists "social-feed delete" on storage.objects;
create policy "social-feed delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'social-feed'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- No SELECT policy: media served via signed URLs only.
