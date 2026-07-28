-- ============================================================
-- Social feed fixes: expose the minimal cross-user data the feed needs.
--
-- profiles, workout_sessions and set_logs are all owner-only under RLS, so a
-- viewer couldn't read a post author's name/avatar (showed "Someone") or the
-- exercises of a shared workout (showed "0 exercises"). These SECURITY DEFINER
-- functions return only public feed data, and the workout summary is scoped to
-- sessions that have actually been shared to the feed.
-- ============================================================

-- Basic public profile info for a set of users (names/avatars are public within
-- the app's social feed).
create or replace function public.feed_author_profiles(p_ids uuid[])
returns table (id uuid, full_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.avatar_url
  from public.profiles p
  where p.id = any(p_ids);
$$;

revoke execute on function public.feed_author_profiles(uuid[]) from anon, public;
grant execute on function public.feed_author_profiles(uuid[]) to authenticated;

-- Summary of a workout session, but only when that session has been shared to
-- the feed (referenced by a social_posts row). Returns null otherwise, so this
-- can't be used to read arbitrary users' private sessions.
create or replace function public.feed_workout_summary(p_session_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with shared as (
    select 1
    from public.social_posts sp
    where sp.workout_session_id = p_session_id
    limit 1
  ),
  agg as (
    select
      e.name as exercise_name,
      count(*)::int as sets,
      max(sl.reps) as reps,
      max(sl.weight_kg) as weight,
      coalesce(sum(coalesce(sl.weight_kg, 0) * coalesce(sl.reps, 0)), 0) as volume
    from public.set_logs sl
    join public.exercises e on e.id = sl.exercise_id
    where sl.session_id = p_session_id
      and sl.completed = true
      and exists (select 1 from shared)
    group by e.name
    order by e.name
  )
  select case
    when not exists (select 1 from shared) then null
    else jsonb_build_object(
      'duration', (select total_seconds from public.workout_sessions where id = p_session_id),
      'exerciseCount', (select count(*) from agg),
      'totalVolume', (select coalesce(round(sum(volume)), 0) from agg),
      'exercises', coalesce(
        (select jsonb_agg(jsonb_build_object(
          'name', exercise_name,
          'sets', sets,
          'reps', reps,
          'weight', weight
        )) from agg),
        '[]'::jsonb
      )
    )
  end;
$$;

revoke execute on function public.feed_workout_summary(uuid) from anon, public;
grant execute on function public.feed_workout_summary(uuid) to authenticated;
