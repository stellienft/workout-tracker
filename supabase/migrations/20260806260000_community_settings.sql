-- ============================================================
-- Community owner settings + anonymous posting.
--  - social_posts.is_anonymous: post shown as "Anonymous" (author still owns
--    it for moderation/delete, but their identity isn't exposed to others).
--  - communities.post_policy: who can post ('members' | 'owner').
--  - communities.allow_media: whether photo/video posts are allowed in-group.
--  (communities.cover_image_path already exists from the communities migration.)
-- Idempotent.
-- ============================================================

alter table public.social_posts
  add column if not exists is_anonymous boolean not null default false;

alter table public.communities
  add column if not exists post_policy text not null default 'members'
  check (post_policy in ('members', 'owner'));

alter table public.communities
  add column if not exists allow_media boolean not null default true;
