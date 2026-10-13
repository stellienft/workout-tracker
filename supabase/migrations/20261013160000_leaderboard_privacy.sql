-- Leaderboard privacy + moderation.
--  * leaderboard_excluded   — hide an account from the board entirely (test/dev
--    accounts, duplicates). Set by an admin, not a member toggle.
--  * leaderboard_name_hidden — the member chooses to appear with a masked name
--    (e.g. "I*** H***") instead of their full name.
alter table public.profiles
  add column if not exists leaderboard_excluded boolean not null default false,
  add column if not exists leaderboard_name_hidden boolean not null default false;

-- leaderboard_top: rank all opted-in, non-excluded members in the caller's age
-- segment (0 points until they train this week); mask names for members who
-- opted into name hiding (except the caller's own row).
create or replace function public.leaderboard_top(p_limit int default 50)
returns table (
  user_id uuid, full_name text, avatar_url text,
  points int, completed_sessions int, active_days int,
  rank bigint, is_me boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with me as (
    select coalesce((select coalesce(age,18) < 18 from public.profiles where id = auth.uid()), false) as minor
  ),
  base as (
    select p.id as user_id, p.full_name, p.avatar_url,
           coalesce(p.leaderboard_name_hidden, false) as name_hidden,
           coalesce(e.points, 0) as points,
           coalesce(e.completed_sessions, 0) as completed_sessions,
           coalesce(e.active_days, 0) as active_days
    from public.profiles p
    cross join me
    left join public.leaderboard_entries e
      on e.user_id = p.id
     and e.period_start = date_trunc('week', now())::date
    where coalesce(p.leaderboard_opt_in, true)
      and not coalesce(p.leaderboard_excluded, false)
      and (coalesce(p.age, 18) < 18) = me.minor
  ),
  ranked as (
    select b.*, rank() over (order by b.points desc) as rank
    from base b
  )
  select user_id,
         case
           when name_hidden and user_id <> auth.uid()
             then regexp_replace(coalesce(full_name, 'Athlete'), '(\m\w)\w+', '\1***', 'g')
           else full_name
         end as full_name,
         avatar_url, points, completed_sessions, active_days,
         rank, (user_id = auth.uid()) as is_me
  from ranked
  order by rank asc, full_name asc nulls last
  limit greatest(1, least(p_limit, 200));
$$;

-- leaderboard_me: same base (opted-in, non-excluded, same segment) for the
-- caller's rank / participant count.
create or replace function public.leaderboard_me()
returns table (
  rank bigint, participants bigint, points int,
  completed_sessions int, active_days int, total_sets int,
  total_volume_kg numeric, prep_sessions int,
  opted_in boolean, is_minor boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with me as (
    select
      coalesce((select coalesce(age,18) < 18 from public.profiles where id = auth.uid()), false) as minor,
      coalesce((select leaderboard_opt_in from public.profiles where id = auth.uid()), true) as opt
  ),
  base as (
    select p.id as user_id,
           coalesce(e.points, 0) as points,
           coalesce(e.completed_sessions, 0) as completed_sessions,
           coalesce(e.active_days, 0) as active_days,
           coalesce(e.total_sets, 0) as total_sets,
           coalesce(e.total_volume_kg, 0) as total_volume_kg,
           coalesce(e.prep_sessions, 0) as prep_sessions
    from public.profiles p
    cross join me
    left join public.leaderboard_entries e
      on e.user_id = p.id
     and e.period_start = date_trunc('week', now())::date
    where coalesce(p.leaderboard_opt_in, true)
      and not coalesce(p.leaderboard_excluded, false)
      and (coalesce(p.age, 18) < 18) = me.minor
  ),
  ranked as (
    select b.*, rank() over (order by b.points desc) as rnk, count(*) over () as participants
    from base b
  )
  select r.rnk, r.participants, r.points,
         r.completed_sessions, r.active_days, r.total_sets,
         r.total_volume_kg, r.prep_sessions,
         me.opt, me.minor
  from ranked r, me
  where r.user_id = auth.uid();
$$;
