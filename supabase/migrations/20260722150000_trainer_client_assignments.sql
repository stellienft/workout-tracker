-- Let trainers assign a program to a client. Assigning materialises the
-- program into a client-owned custom split, so the client trains it through
-- the existing split -> workout pipeline (logging, rest timer, videos) with no
-- workout-mode changes. A trainer_assignments row records the link so the
-- trainer can see and revoke what they've assigned.

-- 1. Mark where a split came from.
alter table public.custom_splits
  add column if not exists source text not null default 'self'
    check (source in ('self', 'coach')),
  add column if not exists assigned_by_user_id uuid
    references auth.users (id) on delete set null;

-- 2. Assignment records (trainer-visible; client can read their own).
create table if not exists public.trainer_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  client_user_id uuid not null references auth.users (id) on delete cascade,
  trainer_program_id uuid references public.trainer_programs (id) on delete set null,
  custom_split_id uuid references public.custom_splits (id) on delete set null,
  assigned_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists trainer_assignments_client_idx
  on public.trainer_assignments (client_user_id);
create index if not exists trainer_assignments_tenant_idx
  on public.trainer_assignments (tenant_id);

alter table public.trainer_assignments enable row level security;

-- Reuse the definer helper from the RLS-recursion fix to avoid re-entering
-- tenants RLS here.
drop policy if exists "trainer manages assignments" on public.trainer_assignments;
create policy "trainer manages assignments" on public.trainer_assignments
  for all to authenticated
  using (tenant_id in (select public.owns_tenant_ids(auth.uid())))
  with check (tenant_id in (select public.owns_tenant_ids(auth.uid())));

drop policy if exists "client reads own assignments" on public.trainer_assignments;
create policy "client reads own assignments" on public.trainer_assignments
  for select to authenticated
  using (client_user_id = auth.uid());

-- 3. Assign a program to a client by cloning it into a client-owned split.
--    SECURITY DEFINER so the trainer can write a row the client owns without a
--    broad cross-account RLS grant; the function itself checks authorisation.
create or replace function public.assign_program_to_client(
  p_program_id uuid,
  p_client_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_name text;
  v_description text;
  v_split_id uuid;
  v_day_label text;
  v_day_id uuid;
  v_daynum int := 0;
  v_existing record;
begin
  -- Caller must own the program's tenant.
  select tp.tenant_id, tp.name, tp.description
    into v_tenant_id, v_name, v_description
  from public.trainer_programs tp
  join public.tenants t on t.id = tp.tenant_id
  where tp.id = p_program_id and t.owner_user_id = auth.uid();
  if v_tenant_id is null then
    raise exception 'Not authorized for this program';
  end if;

  -- Client must be an active client of this tenant.
  if not exists (
    select 1 from public.trainer_clients
    where tenant_id = v_tenant_id
      and user_id = p_client_user_id
      and status = 'active'
  ) then
    raise exception 'Client is not active';
  end if;

  -- Replace any prior assignment of this same program to this client.
  for v_existing in
    select id, custom_split_id from public.trainer_assignments
    where tenant_id = v_tenant_id
      and client_user_id = p_client_user_id
      and trainer_program_id = p_program_id
  loop
    if v_existing.custom_split_id is not null then
      delete from public.custom_splits where id = v_existing.custom_split_id;
    end if;
    delete from public.trainer_assignments where id = v_existing.id;
  end loop;

  -- Client-owned, coach-sourced split.
  insert into public.custom_splits
    (owner_user_id, name, description, source, assigned_by_user_id)
  values
    (p_client_user_id, v_name, coalesce(v_description, 'Assigned by your coach'),
     'coach', auth.uid())
  returning id into v_split_id;

  -- One day per distinct day label, in label order.
  for v_day_label in
    select distinct coalesce(day_label, 'Day 1') as dl
    from public.trainer_program_exercises
    where trainer_program_id = p_program_id
    order by dl
  loop
    v_daynum := v_daynum + 1;
    insert into public.custom_split_days (split_id, day_number, name, focus_muscles)
    values (v_split_id, v_daynum, v_day_label, '{}')
    returning id into v_day_id;

    insert into public.custom_split_day_exercises
      (split_day_id, exercise_id, position, sets, rep_target, rest_seconds)
    select
      v_day_id,
      exercise_id,
      row_number() over (order by position, id),
      coalesce(sets, 3),
      reps,
      coalesce(rest_seconds, 90)
    from public.trainer_program_exercises
    where trainer_program_id = p_program_id
      and coalesce(day_label, 'Day 1') = v_day_label;
  end loop;

  insert into public.trainer_assignments
    (tenant_id, client_user_id, trainer_program_id, custom_split_id, assigned_by)
  values
    (v_tenant_id, p_client_user_id, p_program_id, v_split_id, auth.uid());

  return v_split_id;
end;
$$;

grant execute on function public.assign_program_to_client(uuid, uuid) to authenticated;

-- 4. Revoke an assignment (and remove the client's materialised split).
create or replace function public.unassign_plan(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_split_id uuid;
  v_ok boolean;
begin
  select true, ta.custom_split_id
    into v_ok, v_split_id
  from public.trainer_assignments ta
  where ta.id = p_assignment_id
    and ta.tenant_id in (
      select id from public.tenants where owner_user_id = auth.uid()
    );
  if v_ok is not true then
    raise exception 'Not authorized';
  end if;

  delete from public.trainer_assignments where id = p_assignment_id;
  if v_split_id is not null then
    delete from public.custom_splits where id = v_split_id;
  end if;
end;
$$;

grant execute on function public.unassign_plan(uuid) to authenticated;
