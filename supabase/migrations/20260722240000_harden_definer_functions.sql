-- Security hardening (from Supabase advisor):
--  1. create_notification: reject unauthenticated callers. Previously, when
--     auth.uid() was NULL the guard `p_user_id <> auth.uid()` evaluated to NULL,
--     so the exception never fired and an anon caller could insert a
--     notification row for any user. Add an explicit null check.
--  2. Revoke EXECUTE from anon/public on our SECURITY DEFINER helpers so only
--     signed-in users can call them via the REST rpc endpoint.

create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_user_id <> auth.uid()
     and not exists (
       select 1 from public.trainer_clients tc
       join public.tenants t on t.id = tc.tenant_id
       where (t.owner_user_id = auth.uid() and tc.user_id = p_user_id)
          or (tc.user_id = auth.uid() and t.owner_user_id = p_user_id)
     ) then
    raise exception 'Not authorized to notify this user';
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
end;
$$;

revoke execute on function public.create_notification(uuid, text, text, text, text) from anon, public;
revoke execute on function public.find_user_id_by_email(text) from anon, public;
revoke execute on function public.assign_program_to_client(uuid, uuid) from anon, public;
revoke execute on function public.unassign_plan(uuid) from anon, public;
revoke execute on function public.get_or_create_coach_thread(uuid) from anon, public;
revoke execute on function public.my_client_user_ids() from anon, public;
revoke execute on function public.owns_tenant_ids(uuid) from anon, public;
revoke execute on function public.active_client_tenant_ids(uuid) from anon, public;

grant execute on function public.create_notification(uuid, text, text, text, text) to authenticated;
grant execute on function public.find_user_id_by_email(text) to authenticated;
grant execute on function public.assign_program_to_client(uuid, uuid) to authenticated;
grant execute on function public.unassign_plan(uuid) to authenticated;
grant execute on function public.get_or_create_coach_thread(uuid) to authenticated;
grant execute on function public.my_client_user_ids() to authenticated;
grant execute on function public.owns_tenant_ids(uuid) to authenticated;
grant execute on function public.active_client_tenant_ids(uuid) to authenticated;
