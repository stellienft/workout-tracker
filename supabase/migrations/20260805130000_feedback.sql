-- ============================================================================
-- App feedback: members can leave feedback, feature requests and bug reports.
-- Members insert/read their own; admins read everything for triage.
-- ============================================================================
create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'feedback'
    check (category in ('feedback', 'feature', 'bug', 'other')),
  message text not null,
  email text,
  app_context text,
  status text not null default 'new'
    check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists app_feedback_created_idx
  on public.app_feedback (created_at desc);

alter table public.app_feedback enable row level security;

-- Members can submit and see their own; admins can read all.
drop policy if exists "own or admin feedback read" on public.app_feedback;
create policy "own or admin feedback read" on public.app_feedback
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "insert own feedback" on public.app_feedback;
create policy "insert own feedback" on public.app_feedback
  for insert with check (user_id = auth.uid());

-- Only admins can update (triage status) or delete.
drop policy if exists "admin update feedback" on public.app_feedback;
create policy "admin update feedback" on public.app_feedback
  for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "admin delete feedback" on public.app_feedback;
create policy "admin delete feedback" on public.app_feedback
  for delete using (public.is_admin(auth.uid()));
