-- ============================================================
-- Public profile view for the social feed.
--
-- profiles, workout_sessions and social_follows are owner-/participant-scoped
-- under RLS, so opening another member's profile page read null from profiles
-- and the page called notFound() → a 404. This SECURITY DEFINER function
-- returns just the public profile fields plus aggregate counts, so any signed-in
-- member can view another member's public profile.
-- ============================================================

create or replace function public.public_profile(p_id uuid)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  experience_level text,
  created_at timestamptz,
  workout_count bigint,
  post_count bigint,
  followers_count bigint,
  following_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.experience_level,
    p.created_at,
    (select count(*) from public.workout_sessions ws
       where ws.user_id = p.id and ws.status = 'completed'),
    (select count(*) from public.social_posts sp where sp.user_id = p.id),
    (select count(*) from public.social_follows f where f.following_id = p.id),
    (select count(*) from public.social_follows f where f.follower_id = p.id)
  from public.profiles p
  where p.id = p_id;
$$;

revoke execute on function public.public_profile(uuid) from anon, public;
grant execute on function public.public_profile(uuid) to authenticated;
