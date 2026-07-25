-- Per-client progress for a trainer's dashboard. Client training rows are
-- owner-only under RLS, so this SECURITY DEFINER function aggregates them —
-- but only returns rows when the caller actually owns the tenant.
create or replace function public.trainer_client_progress(p_tenant_id uuid)
returns table (
  client_user_id uuid,
  last_session_at timestamptz,
  sessions_7d integer,
  sessions_30d integer,
  total_sessions integer,
  latest_weight numeric,
  weight_change_30d numeric
)
language sql
security definer
set search_path = public
as $$
  select
    tc.user_id,
    ws.last_session_at,
    coalesce(ws.sessions_7d, 0),
    coalesce(ws.sessions_30d, 0),
    coalesce(ws.total_sessions, 0),
    w.latest_weight,
    case
      when w.latest_weight is not null and w.first_weight_30d is not null
        then w.latest_weight - w.first_weight_30d
      else null
    end
  from public.trainer_clients tc
  left join lateral (
    select
      max(completed_at) as last_session_at,
      count(*) filter (where completed_at >= now() - interval '7 days')::int as sessions_7d,
      count(*) filter (where completed_at >= now() - interval '30 days')::int as sessions_30d,
      count(*)::int as total_sessions
    from public.workout_sessions
    where user_id = tc.user_id and status = 'completed'
  ) ws on true
  left join lateral (
    select
      (select weight_kg from public.body_metrics
        where user_id = tc.user_id and weight_kg is not null
        order by recorded_on desc limit 1) as latest_weight,
      (select weight_kg from public.body_metrics
        where user_id = tc.user_id and weight_kg is not null
          and recorded_on >= current_date - 30
        order by recorded_on asc limit 1) as first_weight_30d
  ) w on true
  where tc.tenant_id = p_tenant_id
    and tc.status = 'active'
    and exists (
      select 1 from public.tenants t
      where t.id = p_tenant_id and t.owner_user_id = auth.uid()
    );
$$;

revoke execute on function public.trainer_client_progress(uuid) from anon, public;
grant execute on function public.trainer_client_progress(uuid) to authenticated;
