-- ============================================================
-- Home Hub: a voice-controlled kiosk surface (/hub) for a wall- or
-- bench-mounted Android tablet. Three tables, all owner-only:
--
--   hub_settings  one row per member — wake word, voice, location, quiet hours
--   hub_alarms    alarms and timers, so they survive a tablet reboot
--   hub_routines  named phrases ("good morning") that run a list of steps
--
-- Alarms are deliberately server-side: the tablet schedules them locally while
-- the hub is open (precise to the second), and the every-minute cron in
-- /api/cron/hub-alarms sends a web push as the backup path when it isn't.
-- Idempotent throughout.
-- ============================================================

-- 1. Settings -------------------------------------------------
create table if not exists public.hub_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  wake_word text not null default 'hey stellio',
  wake_enabled boolean not null default true,
  voice_name text,
  voice_rate numeric not null default 1.0 check (voice_rate between 0.5 and 2.0),
  voice_pitch numeric not null default 1.0 check (voice_pitch between 0.0 and 2.0),
  speak_confirmations boolean not null default true,
  place_label text,
  latitude numeric,
  longitude numeric,
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  use_24h boolean not null default false,
  -- Quiet hours dim the display and mute spoken confirmations overnight.
  quiet_start smallint check (quiet_start between 0 and 23),
  quiet_end smallint check (quiet_end between 0 and 23),
  night_dim boolean not null default true,
  -- Spotify Connect target on this tablet, remembered between sessions.
  spotify_device_id text,
  spotify_device_name text,
  display_name text,
  -- Heartbeat from an open hub. The cron alarm sender stands down while a
  -- device is live, so a ringing tablet doesn't also buzz the owner's phone.
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hub_settings enable row level security;

drop policy if exists "hub_settings owner" on public.hub_settings;
create policy "hub_settings owner" on public.hub_settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2. Alarms and timers ----------------------------------------
create table if not exists public.hub_alarms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'alarm' check (kind in ('alarm', 'timer')),
  -- Absolute instant the alarm next fires. Recurring alarms have this rolled
  -- forward to the next matching day after each fire.
  fire_at timestamptz not null,
  label text,
  -- Day-of-week recurrence, 0 = Sunday. Empty/null means a one-shot alarm.
  repeat_days smallint[],
  enabled boolean not null default true,
  -- Set when the member says "snooze"; the ring is re-armed for this instant.
  snoozed_until timestamptz,
  last_fired_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists hub_alarms_user_fire_idx
  on public.hub_alarms (user_id, fire_at);
-- The cron sender scans upcoming enabled alarms across all members.
create index if not exists hub_alarms_due_idx
  on public.hub_alarms (fire_at) where enabled;

alter table public.hub_alarms enable row level security;

drop policy if exists "hub_alarms owner" on public.hub_alarms;
create policy "hub_alarms owner" on public.hub_alarms
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. Routines -------------------------------------------------
-- steps is a jsonb array of { type, ... } actions executed in order, e.g.
--   [{"type":"speak","text":"Good morning"},
--    {"type":"weather","window":"today"},
--    {"type":"music","query":"morning acoustic"}]
create table if not exists public.hub_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  phrase text not null,
  steps jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  -- Optional schedule: run automatically at this local hour/minute on these days.
  schedule_hour smallint check (schedule_hour between 0 and 23),
  schedule_minute smallint check (schedule_minute between 0 and 59),
  schedule_days smallint[],
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists hub_routines_user_idx on public.hub_routines (user_id);

alter table public.hub_routines enable row level security;

drop policy if exists "hub_routines owner" on public.hub_routines;
create policy "hub_routines owner" on public.hub_routines
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
