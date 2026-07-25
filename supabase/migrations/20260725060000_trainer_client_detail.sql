-- Let a trainer view an active client's weight history and progress photos.
-- Both are owner-only under RLS, so these SECURITY DEFINER functions return
-- data only when the caller owns a tenant the client is an active member of.

create or replace function public.trainer_client_metrics(p_client_user_id uuid)
returns table (recorded_on date, weight_kg numeric, waist_cm numeric)
language sql
security definer
set search_path = public
as $$
  select bm.recorded_on, bm.weight_kg, bm.waist_cm
  from public.body_metrics bm
  where bm.user_id = p_client_user_id
    and exists (
      select 1 from public.trainer_clients tc
      join public.tenants t on t.id = tc.tenant_id
      where tc.user_id = p_client_user_id and tc.status = 'active'
        and t.owner_user_id = auth.uid()
    )
  order by bm.recorded_on asc;
$$;

create or replace function public.trainer_client_photos(p_client_user_id uuid)
returns table (id uuid, storage_path text, pose text, taken_on date, weight_kg numeric, note text)
language sql
security definer
set search_path = public
as $$
  select pp.id, pp.storage_path, pp.pose, pp.taken_on, pp.weight_kg, pp.note
  from public.progress_photos pp
  where pp.user_id = p_client_user_id
    and exists (
      select 1 from public.trainer_clients tc
      join public.tenants t on t.id = tc.tenant_id
      where tc.user_id = p_client_user_id and tc.status = 'active'
        and t.owner_user_id = auth.uid()
    )
  order by pp.taken_on desc;
$$;

revoke execute on function public.trainer_client_metrics(uuid) from anon, public;
revoke execute on function public.trainer_client_photos(uuid) from anon, public;
grant execute on function public.trainer_client_metrics(uuid) to authenticated;
grant execute on function public.trainer_client_photos(uuid) to authenticated;
