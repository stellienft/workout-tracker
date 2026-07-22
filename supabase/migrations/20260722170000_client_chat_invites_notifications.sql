-- Client-side coaching: invite acceptance, client chat, and notifications.

-- ============================================================
-- 1. Client invites (pending -> active/declined)
-- ============================================================
alter table public.trainer_clients
  drop constraint if exists trainer_clients_status_check;
alter table public.trainer_clients
  add constraint trainer_clients_status_check
  check (status in ('pending', 'active', 'paused', 'removed', 'declined'));

-- A client can accept/decline (update the status of) their own membership row.
drop policy if exists "client updates own membership" on public.trainer_clients;
create policy "client updates own membership" on public.trainer_clients
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- 2. Client can open a chat thread with their coach
-- ============================================================
create or replace function public.get_or_create_coach_thread(p_tenant_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_thread uuid;
begin
  select t.owner_user_id into v_owner
  from public.tenants t
  join public.trainer_clients tc on tc.tenant_id = t.id
  where t.id = p_tenant_id and tc.user_id = auth.uid() and tc.status = 'active';
  if v_owner is null then
    raise exception 'Not an active client of this coach';
  end if;

  select id into v_thread from public.chat_threads
  where tenant_id = p_tenant_id and trainer_id = v_owner and client_id = auth.uid();

  if v_thread is null then
    insert into public.chat_threads (tenant_id, trainer_id, client_id)
    values (p_tenant_id, v_owner, auth.uid())
    returning id into v_thread;
  end if;

  return v_thread;
end;
$$;
grant execute on function public.get_or_create_coach_thread(uuid) to authenticated;

-- Either participant may touch their thread (e.g. bump last_message_at when
-- sending). Previously only SELECT/INSERT policies existed, so the timestamp
-- update silently affected zero rows.
drop policy if exists "chat participants update threads" on public.chat_threads;
create policy "chat participants update threads" on public.chat_threads
  for update to authenticated
  using (trainer_id = auth.uid() or client_id = auth.uid())
  with check (trainer_id = auth.uid() or client_id = auth.uid());

-- ============================================================
-- 3. Notifications
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "update own notifications" on public.notifications;
create policy "update own notifications" on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Create a notification for another user — only allowed between people who
-- share a coaching relationship (or for yourself), so this can't be used to
-- spam arbitrary accounts.
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
grant execute on function public.create_notification(uuid, text, text, text, text) to authenticated;
