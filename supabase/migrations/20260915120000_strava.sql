-- Strava integration: OAuth tokens + imported activities (runs, rides, etc.).

-- Tokens are secrets: RLS on, NO policies for authenticated users — only the
-- service role (server-side) reads/writes them.
create table if not exists public.strava_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  athlete_id text,
  access_token text not null,
  refresh_token text not null,
  scope text,
  expires_at timestamptz not null,
  last_synced_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.strava_accounts enable row level security;

-- Imported activities are the member's own data — owner-only RLS so the app can
-- read them directly to render the Activities page.
create table if not exists public.external_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null default 'strava',
  external_id text not null,
  activity_type text,
  name text,
  distance_m numeric,
  moving_time_s int,
  elapsed_time_s int,
  elevation_m numeric,
  average_hr numeric,
  max_hr numeric,
  average_speed numeric, -- metres per second
  calories numeric,
  start_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);
create index if not exists external_activities_user_start_idx
  on public.external_activities (user_id, start_at desc);

alter table public.external_activities enable row level security;
drop policy if exists "own activities" on public.external_activities;
create policy "own activities" on public.external_activities
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
