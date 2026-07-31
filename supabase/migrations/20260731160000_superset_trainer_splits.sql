-- ============================================================================
-- Superset / circuit support for trainer programs.
--
-- custom_split_day_exercises already carries superset_group (added in
-- 20260731150000). Trainer programs are authored in trainer_program_exercises
-- and materialised into a client's custom split by assign_program_to_client,
-- so we (1) add superset_group to trainer_program_exercises and (2) carry it
-- through the assignment clone.
-- ============================================================================

alter table public.trainer_program_exercises
  add column if not exists superset_group int;

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
      (split_day_id, exercise_id, position, sets, rep_target, rest_seconds, superset_group)
    select
      v_day_id,
      exercise_id,
      row_number() over (order by position, id),
      coalesce(sets, 3),
      reps,
      coalesce(rest_seconds, 90),
      superset_group
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
