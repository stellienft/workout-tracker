-- Coaching sessions & check-ins a trainer schedules with a client.
create table if not exists public.coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  trainer_id uuid not null references auth.users (id) on delete cascade,
  client_user_id uuid not null references auth.users (id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_min int not null default 30,
  type text not null default 'session' check (type in ('session', 'check_in')),
  location text,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists coaching_sessions_client_idx
  on public.coaching_sessions (client_user_id, scheduled_at);
create index if not exists coaching_sessions_tenant_idx
  on public.coaching_sessions (tenant_id, scheduled_at);

alter table public.coaching_sessions enable row level security;

-- Trainer who owns the tenant manages its sessions.
drop policy if exists "trainer manages coaching sessions" on public.coaching_sessions;
create policy "trainer manages coaching sessions" on public.coaching_sessions
  for all to authenticated
  using (tenant_id in (select public.owns_tenant_ids(auth.uid())))
  with check (tenant_id in (select public.owns_tenant_ids(auth.uid())));

-- Client can read sessions scheduled with them.
drop policy if exists "client reads coaching sessions" on public.coaching_sessions;
create policy "client reads coaching sessions" on public.coaching_sessions
  for select to authenticated
  using (client_user_id = auth.uid());
