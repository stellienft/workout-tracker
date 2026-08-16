-- Server-scheduled rest-timer push reminders.
--
-- iOS PWAs freeze background JavaScript, so a client-side timer can't fire a
-- "rest complete" notification once the app is backgrounded. Instead, when a
-- rest starts the client asks the server to deliver a web push at the exact
-- end time. This one-row-per-user table lets a later request cancel or
-- supersede an in-flight reminder (the held background task re-reads it before
-- sending, and only fires if its token is still the active one).

create table if not exists public.rest_reminders (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token text not null,
  fire_at timestamptz not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.rest_reminders enable row level security;

-- Owner-only access; the API route uses the service role (which bypasses RLS).
drop policy if exists "own rest reminder" on public.rest_reminders;
create policy "own rest reminder" on public.rest_reminders
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
