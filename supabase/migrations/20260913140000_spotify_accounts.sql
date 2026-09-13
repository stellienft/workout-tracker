-- Spotify "now playing" integration: stores each member's OAuth tokens so the
-- server can fetch their currently-playing track during a workout.
--
-- Tokens are secrets: RLS is enabled with NO policies for authenticated users,
-- so the anon/authenticated clients can never read them. Only the service role
-- (used server-side in route handlers / server actions) touches this table.

create table if not exists public.spotify_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  scope text,
  token_type text,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.spotify_accounts enable row level security;
-- Intentionally no policies: service-role-only access.
