-- Cached weekly AI recaps so we generate at most one per member per week.
create table if not exists public.weekly_recaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  summary text not null,
  focus text,
  stats jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);
create index if not exists weekly_recaps_user_idx on public.weekly_recaps (user_id, week_start desc);

alter table public.weekly_recaps enable row level security;

drop policy if exists "read own recaps" on public.weekly_recaps;
create policy "read own recaps" on public.weekly_recaps
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "write own recaps" on public.weekly_recaps;
create policy "write own recaps" on public.weekly_recaps
  for insert to authenticated with check (user_id = auth.uid());
