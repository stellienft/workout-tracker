-- Lightweight daily wellness: water intake and last night's sleep. One row per
-- member per day, free for everyone (not behind the Health tab).
create table if not exists public.daily_wellness (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_on date not null default current_date,
  water_ml int not null default 0,
  sleep_hours numeric(4, 2),
  sleep_quality int check (sleep_quality between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, logged_on)
);
create index if not exists daily_wellness_user_idx
  on public.daily_wellness (user_id, logged_on desc);

alter table public.daily_wellness enable row level security;

drop policy if exists "own daily wellness" on public.daily_wellness;
create policy "own daily wellness" on public.daily_wellness
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
