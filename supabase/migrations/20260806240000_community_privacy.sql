-- ============================================================
-- Private communities + join approval + member moderation.
--
-- - communities.privacy: 'public' (anyone joins & sees posts) or 'private'
--   (anyone can request; only approved members see/post).
-- - community_members.status: 'pending' (requested) or 'approved'.
-- - Owners can approve/reject requests and remove members.
-- - Private-community posts are hidden from non-approved members via RLS.
-- Idempotent throughout.
-- ============================================================

alter table public.communities
  add column if not exists privacy text not null default 'public'
  check (privacy in ('public', 'private'));

alter table public.community_members
  add column if not exists status text not null default 'approved'
  check (status in ('pending', 'approved'));

-- Owners can moderate their community's members (approve requests, remove).
drop policy if exists "community_members update" on public.community_members;
create policy "community_members update" on public.community_members
  for update to authenticated
  using (
    exists (
      select 1 from public.communities c
      where c.id = community_members.community_id
        and c.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.communities c
      where c.id = community_members.community_id
        and c.created_by = auth.uid()
    )
  );

-- Delete: leave your own membership, OR the owner removes a member.
drop policy if exists "community_members delete" on public.community_members;
create policy "community_members delete" on public.community_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.communities c
      where c.id = community_members.community_id
        and c.created_by = auth.uid()
    )
  );

-- Posts in a private community are visible only to approved members
-- (public communities stay visible to everyone). Keeps the block check.
drop policy if exists "social_posts select" on public.social_posts;
create policy "social_posts select"
  on public.social_posts for select to authenticated
  using (
    not exists (
      select 1 from public.social_blocks sb
      where sb.blocker_id = social_posts.user_id
        and sb.blocked_id = auth.uid()
    )
    and (
      community_id is null
      or exists (
        select 1 from public.communities c
        where c.id = social_posts.community_id
          and (
            c.privacy = 'public'
            or exists (
              select 1 from public.community_members cm
              where cm.community_id = social_posts.community_id
                and cm.user_id = auth.uid()
                and cm.status = 'approved'
            )
          )
      )
    )
  );

-- Posting into a community requires an APPROVED membership (freemium + media
-- rules preserved from the communities migration).
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
          and cm.status = 'approved'
      )
    )
  );
