-- ============================================================================
-- Leaderboard MVP: a weekly, points-based global board.
--
-- Points are recomputed from existing training data (no per-action ledger yet),
-- so historical workouts count automatically. Reads go through SECURITY DEFINER
-- functions that (a) join public profile display info and (b) segment by age so
-- under-18s are ranked only against other under-18s, never against adults.
-- ============================================================================

alter table public.profiles
  add column if not exists leaderboard_opt_in boolean not null default true;

create table if not exists public.leaderboard_entries (
  user_id            uuid not null references public.profiles(id) on delete cascade,
  period_start       date not null,
  points             int  not null default 0,
  completed_sessions int  not null default 0,
  active_days        int  not null default 0,
  total_sets         int  not null default 0,
  total_volume_kg    numeric not null default 0,
  prep_sessions      int  not null default 0,
  is_minor           boolean not null default false,
  opted_in           boolean not null default true,
  updated_at         timestamptz not null default now(),
  primary key (user_id, period_start)
);

create index if not exists leaderboard_entries_period_points_idx
  on public.leaderboard_entries (period_start, is_minor, opted_in, points desc);

alter table public.leaderboard_entries enable row level security;

drop policy if exists "read own leaderboard entry" on public.leaderboard_entries;
create policy "read own leaderboard entry" on public.leaderboard_entries
  for select to authenticated using (user_id = auth.uid());

-- Recompute every member's score for the week starting p_period_start (Monday).
create or replace function public.refresh_leaderboard(p_period_start date)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  with win as (
    select p_period_start::date as ps, (p_period_start + 7)::date as pe
  ),
  sess as (
    select s.id, s.user_id, s.completed_at, s.warmup_seconds, s.warmup_stretches
    from public.workout_sessions s, win
    where s.status = 'completed'
      and s.completed_at >= win.ps
      and s.completed_at <  win.pe
  ),
  sess_sets as (
    select se.id, se.user_id,
      count(sl.*) filter (where sl.completed) as sets_raw,
      coalesce(sum(case when sl.completed
                        then coalesce(sl.weight_kg,0) * coalesce(sl.reps,0)
                        else 0 end), 0) as vol
    from sess se
    left join public.set_logs sl on sl.session_id = se.id
    group by se.id, se.user_id
  ),
  per_user as (
    select se.user_id,
      count(distinct se.id) as completed_sessions,
      count(distinct (se.completed_at at time zone 'UTC')::date) as active_days,
      count(distinct se.id) filter (
        where coalesce(se.warmup_seconds,0) > 0
           or jsonb_array_length(coalesce(se.warmup_stretches, '[]'::jsonb)) > 0
      ) as prep_sessions,
      coalesce(sum(least(ss.sets_raw, 50)), 0) as capped_sets,
      coalesce(sum(ss.vol), 0) as total_volume
    from sess se
    join sess_sets ss on ss.id = se.id
    group by se.user_id
  )
  insert into public.leaderboard_entries as le
    (user_id, period_start, points, completed_sessions, active_days,
     total_sets, total_volume_kg, prep_sessions, is_minor, opted_in, updated_at)
  select
    u.user_id,
    win.ps,
    (50 * u.completed_sessions
      + 2  * u.capped_sets
      + 15 * u.active_days
      + 10 * u.prep_sessions
      + round(least(u.total_volume, 50000) / 1000.0)
      + case when u.active_days >= 3 then 100 else 0 end)::int as points,
    u.completed_sessions,
    u.active_days,
    u.capped_sets,
    u.total_volume,
    u.prep_sessions,
    coalesce(p.age, 18) < 18 as is_minor,
    coalesce(p.leaderboard_opt_in, true) as opted_in,
    now()
  from per_user u
  cross join win
  join public.profiles p on p.id = u.user_id
  on conflict (user_id, period_start) do update set
    points             = excluded.points,
    completed_sessions = excluded.completed_sessions,
    active_days        = excluded.active_days,
    total_sets         = excluded.total_sets,
    total_volume_kg    = excluded.total_volume_kg,
    prep_sessions      = excluded.prep_sessions,
    is_minor           = excluded.is_minor,
    opted_in           = excluded.opted_in,
    updated_at         = now();
end;
$$;

create or replace function public.refresh_leaderboard_current()
returns void
language sql
security definer
set search_path to 'public'
as $$
  select public.refresh_leaderboard(date_trunc('week', now())::date);
$$;

-- Top N for the current week, within the caller's age segment, opted-in only.
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
  ranked as (
    select e.user_id, e.points, e.completed_sessions, e.active_days,
           rank() over (order by e.points desc) as rank
    from public.leaderboard_entries e, me
    where e.period_start = date_trunc('week', now())::date
      and e.opted_in
      and e.is_minor = me.minor
  )
  select r.user_id, p.full_name, p.avatar_url,
         r.points, r.completed_sessions, r.active_days,
         r.rank, (r.user_id = auth.uid()) as is_me
  from ranked r
  join public.profiles p on p.id = r.user_id
  order by r.rank asc, p.full_name asc
  limit greatest(1, least(p_limit, 200));
$$;

-- The caller's own standing (rank, points, breakdown, participant count).
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
  ranked as (
    select e.user_id, e.points, e.completed_sessions, e.active_days,
           e.total_sets, e.total_volume_kg, e.prep_sessions,
           rank() over (order by e.points desc) as rnk,
           count(*) over () as participants
    from public.leaderboard_entries e, me
    where e.period_start = date_trunc('week', now())::date
      and e.opted_in
      and e.is_minor = me.minor
  )
  select r.rnk, r.participants, r.points,
         r.completed_sessions, r.active_days, r.total_sets,
         r.total_volume_kg, r.prep_sessions,
         me.opt, me.minor
  from ranked r, me
  where r.user_id = auth.uid();
$$;

grant execute on function public.leaderboard_top(int) to authenticated;
grant execute on function public.leaderboard_me() to authenticated;
-- refresh_* intentionally NOT granted to authenticated — service/cron only.
