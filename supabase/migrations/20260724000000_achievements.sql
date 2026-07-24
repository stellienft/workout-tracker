-- Persist earned achievements so we can show when each was reached and detect
-- newly-earned / levelled-up badges to celebrate. Display values are derived
-- live; this table stores the earned date and the value at time of earning
-- (so a personal-record badge can "level up" when it's beaten).
create table if not exists public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value numeric,
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_achievements enable row level security;

drop policy if exists "own achievements" on public.user_achievements;
create policy "own achievements" on public.user_achievements
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
