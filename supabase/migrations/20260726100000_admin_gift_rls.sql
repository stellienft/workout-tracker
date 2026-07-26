-- Allow admins to grant/revoke free Pro time (gift subscriptions).
-- The existing policy only lets the service role (Stripe webhook) write;
-- admin-initiated gifts from the admin panel need their own write policies.

-- Check if a user has an admin role. Used in the RLS policies below.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.key in ('admin', 'super_admin')
  );
$$;

-- Admins can insert/update free grants
drop policy if exists "admins write free_grants" on public.free_grants;
create policy "admins write free_grants" on public.free_grants
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
