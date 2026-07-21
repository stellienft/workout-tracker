-- Stellio Fit — Multi-tenant trainer system, themes, cardio goal, chat
-- Idempotent: ON CONFLICT DO NOTHING throughout.
-- All functions SECURITY DEFINER where they touch auth/roles.

-- ============================================================
-- 1. New fitness goal: Cardio & Endurance
-- ============================================================
insert into public.fitness_goals
  (id, name, slug, short_description, long_description, cover_image_path,
   recommended_experience_levels, recommended_frequency_min, recommended_frequency_max,
   typical_session_minutes, display_order, active)
values
  ('d0000000-0000-4000-8000-00000000000c', 'Cardio & Endurance', 'cardio-endurance',
   'Build a stronger heart, lungs and engine.',
   'Structured cardio training that progresses from easy steady-state work to high-intensity intervals. Improve aerobic capacity, recovery between sets, and overall conditioning without losing strength.',
   'https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg?auto=compress&cs=tinysrgb&w=800',
   '{beginner,intermediate}', 3, 5, 30, 12, true)
on conflict (slug) do nothing;

-- ============================================================
-- 2. Theme persistence on profiles (saves across devices)
-- ============================================================
alter table public.profiles
  add column if not exists theme_preference text not null default 'system'
  check (theme_preference in ('light','dark','system'));

-- ============================================================
-- 3. Trainer role
-- ============================================================
insert into public.roles (id, key, name, description)
values
  ('f0000000-0000-4000-8000-000000000001', 'trainer', 'Personal Trainer',
   'Can manage their own tenant: branding, programs, clients, and billing. Can onboard users into their portal.')
on conflict (key) do nothing;

-- ============================================================
-- 4. Tenants (trainer white-label portals)
-- ============================================================
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null unique,
  logo_url text,
  accent_color text default '#CCFF30',
  tagline text,
  custom_domain text,
  subscription_active boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tenants_slug_idx on public.tenants (lower(slug));

-- ============================================================
-- 5. Trainer programs (trainer-owned custom programs)
-- ============================================================
create table if not exists public.trainer_programs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  cover_image_path text,
  difficulty text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced','all')),
  duration_weeks int default 4,
  category text default 'strength',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

-- ============================================================
-- 6. Trainer program exercises (pick from exercise library)
-- ============================================================
create table if not exists public.trainer_program_exercises (
  id uuid primary key default gen_random_uuid(),
  trainer_program_id uuid not null references public.trainer_programs (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  day_label text,
  position int not null default 0,
  sets int,
  reps text,
  rest_seconds int,
  notes text,
  created_at timestamptz not null default now(),
  unique (trainer_program_id, exercise_id, day_label, position)
);

-- ============================================================
-- 7. Trainer videos (trainer-owned, can be YouTube or uploaded)
-- ============================================================
create table if not exists public.trainer_videos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null,
  source_url text,
  provider text default 'youtube',
  provider_video_id text,
  embed_url text,
  thumbnail_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 8. Trainer clients (users onboarded by a trainer)
-- ============================================================
create table if not exists public.trainer_clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  notes text,
  status text not null default 'active' check (status in ('active','paused','removed')),
  subscription_active boolean not null default false,
  stripe_customer_id text,
  assigned_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

-- ============================================================
-- 9. Private chat (trainer <-> client)
-- ============================================================
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  trainer_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references auth.users (id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, trainer_id, client_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread_idx on public.chat_messages (thread_id, created_at);
create index if not exists chat_threads_client_idx on public.chat_threads (client_id);
create index if not exists chat_threads_trainer_idx on public.chat_threads (trainer_id);

-- ============================================================
-- 10. Helper: is_trainer
-- ============================================================
create or replace function public.is_trainer(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(uid, 'trainer');
$$;

-- ============================================================
-- 11. Helper: tenant for user (trainer owns, client belongs)
-- ============================================================
create or replace function public.tenant_for_user(uid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  -- Trainer owns a tenant
  select id from public.tenants where owner_user_id = uid
  union
  -- Client belongs to a tenant
  select tenant_id from public.trainer_clients
  where user_id = uid and status = 'active'
  limit 1;
$$;

-- ============================================================
-- 12. Account type on signup (stored in profiles)
-- ============================================================
alter table public.profiles
  add column if not exists account_type text not null default 'user'
  check (account_type in ('user','trainer'));

-- ============================================================
-- 13. RLS for new tables
-- ============================================================
alter table public.tenants enable row level security;
alter table public.trainer_programs enable row level security;
alter table public.trainer_program_exercises enable row level security;
alter table public.trainer_videos enable row level security;
alter table public.trainer_clients enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

-- Tenants: trainer owner reads/writes their tenant; clients read their tenant
create policy "trainer reads own tenant" on public.tenants
  for select to authenticated
  using (owner_user_id = auth.uid()
    or exists (select 1 from public.trainer_clients where user_id = auth.uid() and tenant_id = tenants.id and status = 'active'));

create policy "trainer manages own tenant" on public.tenants
  for all to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Trainer programs
create policy "trainer manages own programs" on public.trainer_programs
  for all to authenticated
  using (tenant_id in (select id from public.tenants where owner_user_id = auth.uid()))
  with check (tenant_id in (select id from public.tenants where owner_user_id = auth.uid()));

create policy "clients read published trainer programs" on public.trainer_programs
  for select to authenticated
  using (published = true and tenant_id in (
    select t.id from public.tenants t
    join public.trainer_clients tc on tc.tenant_id = t.id
    where tc.user_id = auth.uid() and tc.status = 'active'
  ));

-- Trainer program exercises
create policy "trainer manages own program exercises" on public.trainer_program_exercises
  for all to authenticated
  using (trainer_program_id in (
    select tp.id from public.trainer_programs tp
    join public.tenants t on t.id = tp.tenant_id
    where t.owner_user_id = auth.uid()
  ))
  with check (trainer_program_id in (
    select tp.id from public.trainer_programs tp
    join public.tenants t on t.id = tp.tenant_id
    where t.owner_user_id = auth.uid()
  ));

create policy "clients read own trainer program exercises" on public.trainer_program_exercises
  for select to authenticated
  using (trainer_program_id in (
    select tp.id from public.trainer_programs tp
    where tp.published = true
    and tp.tenant_id in (
      select t.id from public.tenants t
      join public.trainer_clients tc on tc.tenant_id = t.id
      where tc.user_id = auth.uid() and tc.status = 'active'
    )
  ));

-- Trainer videos
create policy "trainer manages own videos" on public.trainer_videos
  for all to authenticated
  using (tenant_id in (select id from public.tenants where owner_user_id = auth.uid()))
  with check (tenant_id in (select id from public.tenants where owner_user_id = auth.uid()));

create policy "clients read own trainer videos" on public.trainer_videos
  for select to authenticated
  using (tenant_id in (
    select t.id from public.tenants t
    join public.trainer_clients tc on tc.tenant_id = t.id
    where tc.user_id = auth.uid() and tc.status = 'active'
  ));

-- Trainer clients
create policy "trainer manages own clients" on public.trainer_clients
  for all to authenticated
  using (tenant_id in (select id from public.tenants where owner_user_id = auth.uid()))
  with check (tenant_id in (select id from public.tenants where owner_user_id = auth.uid()));

create policy "client reads own client record" on public.trainer_clients
  for select to authenticated
  using (user_id = auth.uid());

-- Chat threads
create policy "chat participants read threads" on public.chat_threads
  for select to authenticated
  using (trainer_id = auth.uid() or client_id = auth.uid());

create policy "trainer creates chat threads" on public.chat_threads
  for insert to authenticated
  with check (trainer_id = auth.uid()
    and tenant_id in (select id from public.tenants where owner_user_id = auth.uid()));

-- Chat messages
create policy "chat participants read messages" on public.chat_messages
  for select to authenticated
  using (thread_id in (
    select id from public.chat_threads
    where trainer_id = auth.uid() or client_id = auth.uid()
  ));

create policy "chat participants send messages" on public.chat_messages
  for insert to authenticated
  with check (thread_id in (
    select id from public.chat_threads
    where trainer_id = auth.uid() or client_id = auth.uid()
  ) and sender_id = auth.uid());

create policy "chat participants update messages" on public.chat_messages
  for update to authenticated
  using (thread_id in (
    select id from public.chat_threads
    where trainer_id = auth.uid() or client_id = auth.uid()
  ));

-- ============================================================
-- 14. Updated_at triggers for new tables
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['tenants','trainer_programs']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_t before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ============================================================
-- 15. Set account_type on signup from raw_user_meta_data
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalised_email text := lower(trim(new.email));
  user_role_id uuid;
  super_admin_role_id uuid;
  trainer_role_id uuid;
  acct_type text := coalesce(new.raw_user_meta_data ->> 'account_type', 'user');
begin
  insert into public.profiles (id, email, full_name, account_type)
  values (
    new.id,
    normalised_email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    acct_type
  )
  on conflict (id) do update set
    account_type = excluded.account_type,
    full_name = coalesce(excluded.full_name, public.profiles.full_name);

  -- Assign 'user' role to everyone
  select id into user_role_id from public.roles where key = 'user';
  if user_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new.id, user_role_id)
    on conflict (user_id, role_id) do nothing;
  end if;

  -- Assign 'trainer' role if they signed up as a trainer
  if acct_type = 'trainer' then
    select id into trainer_role_id from public.roles where key = 'trainer';
    if trainer_role_id is not null then
      insert into public.user_roles (user_id, role_id)
      values (new.id, trainer_role_id)
      on conflict (user_id, role_id) do nothing;
    end if;
  end if;

  -- Reserved super-admin promotion
  if normalised_email = 'hello@stellio.com.au' then
    select id into super_admin_role_id from public.roles where key = 'super_admin';
    if super_admin_role_id is not null then
      insert into public.user_roles (user_id, role_id)
      values (new.id, super_admin_role_id)
      on conflict (user_id, role_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================
-- 16. Featured content for the cardio goal
-- ============================================================
insert into public.featured_content
  (placement, content_type, content_id, image_path, headline, subheading,
   call_to_action_label, call_to_action_href, display_order, active)
values
  ('dashboard_discover', 'program', 'b0000000-0000-4000-8000-00000000000e',
   'https://images.pexels.com/photos/5961852/pexels-photo-5961852.jpeg?auto=compress&cs=tinysrgb&w=800',
   'Build your engine.',
   'Cardio & Endurance — steady-state and intervals for a stronger heart and lungs.',
   'Explore Programs', '/programs?goal=cardio-endurance', 10, true)
on conflict do nothing;
