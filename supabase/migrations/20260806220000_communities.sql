-- ============================================================
-- Communities (Facebook-style groups): create, join, post, leave.
-- Community posts reuse social_posts via a nullable community_id, so all the
-- existing reaction/comment/moderation machinery works unchanged.
--
-- Also relaxes the social insert RLS to match the app's freemium model:
-- everyone can post text, comment, react and follow; photo/video stays Pro.
-- Idempotent throughout.
-- ============================================================

-- 1. Tables ---------------------------------------------------
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 1000),
  cover_image_path text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists communities_created_at_idx on public.communities (created_at desc);

create table if not exists public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index if not exists community_members_user_idx on public.community_members (user_id);

alter table public.social_posts
  add column if not exists community_id uuid references public.communities (id) on delete cascade;
create index if not exists social_posts_community_idx
  on public.social_posts (community_id, created_at desc);

-- 2. RLS: communities + membership ----------------------------
alter table public.communities enable row level security;
alter table public.community_members enable row level security;

drop policy if exists "communities select" on public.communities;
create policy "communities select" on public.communities
  for select to authenticated using (true);

drop policy if exists "communities insert" on public.communities;
create policy "communities insert" on public.communities
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "communities update" on public.communities;
create policy "communities update" on public.communities
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "communities delete" on public.communities;
create policy "communities delete" on public.communities
  for delete to authenticated using (created_by = auth.uid());

drop policy if exists "community_members select" on public.community_members;
create policy "community_members select" on public.community_members
  for select to authenticated using (true);

drop policy if exists "community_members insert" on public.community_members;
create policy "community_members insert" on public.community_members
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "community_members delete" on public.community_members;
create policy "community_members delete" on public.community_members
  for delete to authenticated using (user_id = auth.uid());

-- 3. Relaxed social insert RLS (freemium + community membership) ----
-- Posts: anyone can post text; photo/video needs Pro; community posts
-- require membership of that community.
drop policy if exists "social_posts insert" on public.social_posts;
create policy "social_posts insert"
  on public.social_posts for insert to authenticated
  with check (
    user_id = auth.uid()
    and (media_type = 'none' or public.is_pro_user(auth.uid()))
    and (
      community_id is null
      or exists (
        select 1 from public.community_members cm
        where cm.community_id = social_posts.community_id
          and cm.user_id = auth.uid()
      )
    )
  );

-- Comments / reactions / follows: no longer Pro-gated.
drop policy if exists "social_comments insert" on public.social_comments;
create policy "social_comments insert"
  on public.social_comments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "social_reactions insert" on public.social_reactions;
create policy "social_reactions insert"
  on public.social_reactions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "social_follows insert" on public.social_follows;
create policy "social_follows insert"
  on public.social_follows for insert to authenticated
  with check (follower_id = auth.uid());
