-- Phase 2: trainers build their own coaching packages and assign them to
-- clients. An active assignment also grants the client Pro app access (checked
-- in lib/entitlements).

-- ---------- Packages (owned by the trainer's tenant) ----------
create table if not exists public.trainer_packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  description text,
  price_cents int not null default 0,
  currency text not null default 'aud',
  interval text not null default 'monthly' check (interval in ('monthly', 'weekly', 'one_off')),
  features text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trainer_packages_tenant_idx on public.trainer_packages (tenant_id);

alter table public.trainer_packages enable row level security;

drop policy if exists "trainer manages packages" on public.trainer_packages;
create policy "trainer manages packages" on public.trainer_packages
  for all to authenticated
  using (tenant_id in (select public.owns_tenant_ids(auth.uid())))
  with check (tenant_id in (select public.owns_tenant_ids(auth.uid())));

drop policy if exists "clients read tenant packages" on public.trainer_packages;
create policy "clients read tenant packages" on public.trainer_packages
  for select to authenticated
  using (tenant_id in (select public.active_client_tenant_ids(auth.uid())));

-- ---------- Assignment of a package to a client ----------
create table if not exists public.trainer_client_packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  client_user_id uuid not null references auth.users (id) on delete cascade,
  package_id uuid references public.trainer_packages (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  assigned_by uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, client_user_id)
);
create index if not exists trainer_client_packages_client_idx
  on public.trainer_client_packages (client_user_id);

alter table public.trainer_client_packages enable row level security;

drop policy if exists "trainer manages client packages" on public.trainer_client_packages;
create policy "trainer manages client packages" on public.trainer_client_packages
  for all to authenticated
  using (tenant_id in (select public.owns_tenant_ids(auth.uid())))
  with check (tenant_id in (select public.owns_tenant_ids(auth.uid())));

drop policy if exists "client reads own package" on public.trainer_client_packages;
create policy "client reads own package" on public.trainer_client_packages
  for select to authenticated
  using (client_user_id = auth.uid());
