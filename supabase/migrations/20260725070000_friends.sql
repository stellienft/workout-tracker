-- Social phase 1: friends, a friends leaderboard, and sharing a workout.

-- ---------- Friendships ----------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_requester_idx on public.friendships (requester_id);

alter table public.friendships enable row level security;

drop policy if exists "read own friendships" on public.friendships;
create policy "read own friendships" on public.friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "send friend request" on public.friendships;
create policy "send friend request" on public.friendships
  for insert to authenticated with check (requester_id = auth.uid());

drop policy if exists "update own friendship" on public.friendships;
create policy "update own friendship" on public.friendships
  for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "delete own friendship" on public.friendships;
create policy "delete own friendship" on public.friendships
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ---------- Shared workouts (snapshot so the recipient needs no cross-user read) ----------
create table if not exists public.workout_shares (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users (id) on delete cascade,
  from_name text,
  to_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  imported_at timestamptz
);
create index if not exists workout_shares_to_idx on public.workout_shares (to_user_id);

alter table public.workout_shares enable row level security;

drop policy if exists "read own shares" on public.workout_shares;
create policy "read own shares" on public.workout_shares
  for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

drop policy if exists "send shares" on public.workout_shares;
create policy "send shares" on public.workout_shares
  for insert to authenticated with check (from_user_id = auth.uid());

drop policy if exists "recipient updates share" on public.workout_shares;
create policy "recipient updates share" on public.workout_shares
  for update to authenticated
  using (to_user_id = auth.uid()) with check (to_user_id = auth.uid());

drop policy if exists "delete own share" on public.workout_shares;
create policy "delete own share" on public.workout_shares
  for delete to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

-- ---------- Friends list with names (profiles are otherwise owner-only) ----------
create or replace function public.friend_list()
returns table (
  friendship_id uuid,
  other_user_id uuid,
  other_name text,
  other_email text,
  status text,
  direction text
)
language sql
security definer
set search_path = public
as $$
  select
    f.id,
    case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end,
    pr.full_name,
    pr.email,
    f.status,
    case
      when f.status = 'accepted' then 'friend'
      when f.requester_id = auth.uid() then 'outgoing'
      else 'incoming'
    end
  from public.friendships f
  join public.profiles pr
    on pr.id = (case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end)
  where auth.uid() in (f.requester_id, f.addressee_id)
    and f.status in ('pending', 'accepted')
  order by f.updated_at desc;
$$;

-- ---------- Friends leaderboard (aggregates only) ----------
create or replace function public.friend_leaderboard()
returns table (
  user_id uuid,
  full_name text,
  sessions_7d integer,
  sessions_30d integer,
  total_sessions integer,
  last_session_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with people as (
    select auth.uid() as uid
    union
    select case when requester_id = auth.uid() then addressee_id else requester_id end
    from public.friendships
    where status = 'accepted' and auth.uid() in (requester_id, addressee_id)
  )
  select
    p.uid,
    pr.full_name,
    coalesce(count(ws.id) filter (where ws.completed_at >= now() - interval '7 days'), 0)::int,
    coalesce(count(ws.id) filter (where ws.completed_at >= now() - interval '30 days'), 0)::int,
    coalesce(count(ws.id), 0)::int,
    max(ws.completed_at)
  from people p
  left join public.profiles pr on pr.id = p.uid
  left join public.workout_sessions ws
    on ws.user_id = p.uid and ws.status = 'completed'
  group by p.uid, pr.full_name;
$$;

revoke execute on function public.friend_list() from anon, public;
revoke execute on function public.friend_leaderboard() from anon, public;
grant execute on function public.friend_list() to authenticated;
grant execute on function public.friend_leaderboard() to authenticated;
