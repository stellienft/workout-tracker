-- Fix "infinite recursion detected in policy for relation tenants".
--
-- The tenants SELECT policy referenced trainer_clients, while the
-- trainer_clients policy referenced tenants. Evaluating either policy forced
-- Postgres to evaluate the other, and so on forever — so any read of a tenant
-- (including the trainer-portal workspace bootstrap) blew up.
--
-- Break the cycle by routing both cross-table lookups through SECURITY DEFINER
-- helpers. Because a definer function runs with the owner's rights, the table
-- reads inside it do NOT re-enter RLS, so no policy references the other table
-- directly anymore.

create or replace function public.owns_tenant_ids(uid uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.tenants where owner_user_id = uid;
$$;

create or replace function public.active_client_tenant_ids(uid uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.trainer_clients
  where user_id = uid and status = 'active';
$$;

grant execute on function public.owns_tenant_ids(uuid) to authenticated;
grant execute on function public.active_client_tenant_ids(uuid) to authenticated;

-- Tenants: the owner reads their own tenant; an active client reads the tenant
-- they belong to — resolved via the definer helper instead of a live
-- trainer_clients subquery.
drop policy if exists "trainer reads own tenant" on public.tenants;
create policy "trainer reads own tenant" on public.tenants
  for select to authenticated
  using (
    owner_user_id = auth.uid()
    or id in (select public.active_client_tenant_ids(auth.uid()))
  );

-- Trainer manages their client rows; tenant ownership is checked via the
-- definer helper instead of a live tenants subquery.
drop policy if exists "trainer manages own clients" on public.trainer_clients;
create policy "trainer manages own clients" on public.trainer_clients
  for all to authenticated
  using (tenant_id in (select public.owns_tenant_ids(auth.uid())))
  with check (tenant_id in (select public.owns_tenant_ids(auth.uid())));
