-- Friends: resolve an email to a user id when sending a friend request.
--
-- The Friends feature was reusing public.find_user_id_by_email, but that
-- function is gated to tenant owners (it was built for the trainer "add client
-- by email" flow):
--   ... and exists (select 1 from public.tenants t where t.owner_user_id = auth.uid())
-- So any regular member always got "No Stellio Fit user with that email", even
-- when the account existed. This dedicated function has no tenant guard — any
-- authenticated member can look up another member by email to friend them.
--
-- It returns only the user id (never profile data), so it exposes nothing
-- beyond whether an email has an account, which is inherent to add-by-email.
create or replace function public.friend_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where lower(p.email) = lower(trim(p_email))
  limit 1;
$$;

revoke execute on function public.friend_user_id_by_email(text) from anon, public;
grant execute on function public.friend_user_id_by_email(text) to authenticated;
