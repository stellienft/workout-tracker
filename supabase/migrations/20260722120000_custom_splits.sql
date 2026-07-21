-- Custom splits: user-built training splits (members AND trainers).
-- A split has days ("Day 1 — Chest & Triceps"), each day has a muscle focus
-- and a list of exercises with sets/reps/rest. Sessions can start from a
-- split day directly, so workout mode, set logging and history all work.

create table if not exists public.custom_splits (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_split_days (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.custom_splits (id) on delete cascade,
  day_number int not null,
  name text not null,
  focus_muscles text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  unique (split_id, day_number)
);

create table if not exists public.custom_split_day_exercises (
  id uuid primary key default gen_random_uuid(),
  split_day_id uuid not null references public.custom_split_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position int not null default 0,
  sets int not null default 3,
  rep_target text,
  rest_seconds int not null default 90,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists custom_split_days_split_idx
  on public.custom_split_days (split_id, day_number);
create index if not exists custom_split_day_exercises_day_idx
  on public.custom_split_day_exercises (split_day_id, position);

-- Sessions can originate from a split day instead of a program template.
alter table public.workout_sessions
  add column if not exists custom_split_day_id uuid
    references public.custom_split_days (id) on delete set null;

-- ---------- RLS: owner-only ----------
alter table public.custom_splits enable row level security;
alter table public.custom_split_days enable row level security;
alter table public.custom_split_day_exercises enable row level security;

drop policy if exists "own splits" on public.custom_splits;
create policy "own splits" on public.custom_splits
  for all to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists "own split days" on public.custom_split_days;
create policy "own split days" on public.custom_split_days
  for all to authenticated
  using (exists (select 1 from public.custom_splits s
                 where s.id = split_id and s.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.custom_splits s
                      where s.id = split_id and s.owner_user_id = auth.uid()));

drop policy if exists "own split day exercises" on public.custom_split_day_exercises;
create policy "own split day exercises" on public.custom_split_day_exercises
  for all to authenticated
  using (exists (select 1 from public.custom_split_days d
                 join public.custom_splits s on s.id = d.split_id
                 where d.id = split_day_id and s.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.custom_split_days d
                      join public.custom_splits s on s.id = d.split_id
                      where d.id = split_day_id and s.owner_user_id = auth.uid()));
