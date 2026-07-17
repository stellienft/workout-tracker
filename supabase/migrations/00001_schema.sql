-- Stellio Fit — core schema
-- Run order: 00001_schema.sql -> 00002_rls.sql -> seed.sql

create extension if not exists "pgcrypto";

-- ============================================================
-- Roles
-- ============================================================

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role_id)
);

-- ============================================================
-- Profiles
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  onboarding_completed boolean not null default false,
  experience_level text check (experience_level in ('beginner','intermediate','advanced')),
  weekly_frequency int check (weekly_frequency between 1 and 7),
  session_minutes int,
  equipment text[] not null default '{}',
  training_days text[] not null default '{}',
  considerations text,
  medication_tracking_enabled boolean not null default false,
  haptics_enabled boolean not null default true,
  unit_preference text not null default 'metric' check (unit_preference in ('metric','imperial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Media assets
-- ============================================================

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users (id) on delete set null,
  storage_bucket text not null default 'media',
  storage_path text not null,
  media_type text not null default 'image',
  alt_text text,
  focal_x numeric not null default 0.5,
  focal_y numeric not null default 0.5,
  blur_data_url text,
  width int,
  height int,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

-- ============================================================
-- Fitness goals
-- ============================================================

create table public.fitness_goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text,
  long_description text,
  cover_image_path text,
  recommended_experience_levels text[] not null default '{}',
  recommended_frequency_min int,
  recommended_frequency_max int,
  typical_session_minutes int,
  display_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fitness_goal_id uuid not null references public.fitness_goals (id) on delete cascade,
  is_primary boolean not null default false,
  selected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fitness_goal_id)
);

-- at most one primary goal per user
create unique index user_goals_one_primary
  on public.user_goals (user_id)
  where is_primary;

-- ============================================================
-- Exercises
-- ============================================================

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null default 'strength',
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  equipment text[] not null default '{}',
  difficulty text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced')),
  instructions text,
  technique_cues text[] not null default '{}',
  shoulder_safe boolean not null default true,
  shoulder_notes text,
  cover_image_path text,
  status text not null default 'published' check (status in ('draft','review','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercise_alternatives (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  alternative_exercise_id uuid not null references public.exercises (id) on delete cascade,
  reason text,
  priority int not null default 0,
  created_at timestamptz not null default now(),
  unique (exercise_id, alternative_exercise_id),
  check (exercise_id <> alternative_exercise_id)
);

create table public.exercise_videos (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  provider text not null default 'youtube',
  source_url text not null,
  provider_video_id text,
  embed_url text,
  thumbnail_url text,
  title text,
  creator_name text,
  duration_seconds int,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','verified','broken','placeholder')),
  last_verified_at timestamptz,
  admin_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Programs
-- ============================================================

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  fitness_goal_id uuid references public.fitness_goals (id) on delete set null,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  cover_image_path text,
  experience_level text not null default 'beginner'
    check (experience_level in ('beginner','intermediate','advanced','all')),
  scheduling_mode text not null default 'sequential'
    check (scheduling_mode in ('sequential','weekly_split','calendar')),
  duration_weeks int not null default 8,
  minimum_days_per_week int not null default 2,
  maximum_days_per_week int not null default 3,
  estimated_session_minutes int not null default 45,
  equipment_requirements text[] not null default '{}',
  difficulty text not null default 'beginner',
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  featured boolean not null default false,
  safety_notes text,
  published_at timestamptz,
  version int not null default 1,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  week_number int not null,
  name text,
  focus text,
  is_deload boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (program_id, week_number)
);

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  name text not null,
  slug text not null,
  category text not null default 'strength',
  description text,
  cover_image_path text,
  -- sequential mode: order within the repeating rotation (1 = A, 2 = B, ...)
  sequence_order int,
  -- weekly_split mode: position within the training week (1 = day 1, ...)
  week_position int,
  -- calendar mode: 0=Sunday..6=Saturday
  day_of_week int check (day_of_week between 0 and 6),
  estimated_minutes int not null default 45,
  difficulty text not null default 'beginner',
  target_muscle_groups text[] not null default '{}',
  is_optional boolean not null default false,
  workout_type text not null default 'strength'
    check (workout_type in ('strength','hypertrophy','conditioning','recovery','mobility','cardio')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, slug)
);

create table public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_template_id uuid not null references public.workout_templates (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position int not null,
  sets int not null default 3,
  rep_min int,
  rep_max int,
  rep_target text,
  rest_seconds int not null default 90,
  tempo text,
  notes text,
  is_optional boolean not null default false,
  superset_group int,
  created_at timestamptz not null default now(),
  unique (workout_template_id, position)
);

-- ============================================================
-- Enrolments & saved programs
-- ============================================================

create table public.program_enrolments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  program_version int not null default 1,
  enrolled_at timestamptz not null default now(),
  start_date date not null default current_date,
  current_week int not null default 1,
  -- sequential mode: index into the required-workout rotation of the NEXT workout
  next_workout_sequence int not null default 1,
  selected_days_per_week int not null default 3,
  status text not null default 'active'
    check (status in ('pending','active','paused','completed','abandoned')),
  paused_at timestamptz,
  completed_at timestamptz,
  previous_enrolment_id uuid references public.program_enrolments (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- one active/paused primary program at a time
create unique index program_enrolments_one_active
  on public.program_enrolments (user_id)
  where status in ('active','paused');

create table public.saved_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, program_id)
);

-- ============================================================
-- Workout sessions & set logs
-- ============================================================

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  enrolment_id uuid references public.program_enrolments (id) on delete set null,
  program_id uuid references public.programs (id) on delete set null,
  workout_template_id uuid references public.workout_templates (id) on delete set null,
  week_number int,
  status text not null default 'in_progress'
    check (status in ('in_progress','completed','abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_seconds int,
  pre_shoulder_pain int check (pre_shoulder_pain between 0 and 10),
  pre_energy int check (pre_energy between 1 and 5),
  pre_readiness int check (pre_readiness between 1 and 5),
  discomfort_reported boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_sessions_user_idx on public.workout_sessions (user_id, started_at desc);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  template_exercise_id uuid references public.workout_template_exercises (id) on delete set null,
  substituted_from_exercise_id uuid references public.exercises (id) on delete set null,
  set_number int not null,
  weight_kg numeric,
  reps int,
  rpe numeric check (rpe between 1 and 10),
  duration_seconds int,
  distance_m numeric,
  completed boolean not null default true,
  pain_level int check (pain_level between 0 and 10),
  notes text,
  created_at timestamptz not null default now(),
  unique (session_id, exercise_id, set_number)
);

create index set_logs_user_exercise_idx on public.set_logs (user_id, exercise_id, created_at desc);

create table public.pain_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.workout_sessions (id) on delete set null,
  exercise_id uuid references public.exercises (id) on delete set null,
  body_area text not null default 'left_shoulder',
  severity int not null check (severity between 0 and 10),
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Tracking: body metrics, check-ins, medication
-- ============================================================

create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recorded_on date not null default current_date,
  weight_kg numeric,
  chest_cm numeric,
  waist_cm numeric,
  hips_cm numeric,
  left_arm_cm numeric,
  right_arm_cm numeric,
  left_thigh_cm numeric,
  right_thigh_cm numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, recorded_on)
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  checked_on date not null default current_date,
  checkin_type text not null default 'daily' check (checkin_type in ('daily','weekly')),
  energy int check (energy between 1 and 5),
  sleep_quality int check (sleep_quality between 1 and 5),
  soreness int check (soreness between 1 and 5),
  mood int check (mood between 1 and 5),
  shoulder_pain int check (shoulder_pain between 0 and 10),
  recovery int check (recovery between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, checked_on, checkin_type)
);

create table public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_name text not null default 'Mounjaro',
  dose_mg numeric,
  taken_on date not null default current_date,
  injection_site text,
  side_effects text[] not null default '{}',
  side_effect_severity int check (side_effect_severity between 0 and 5),
  notes text,
  created_at timestamptz not null default now()
);

create index medication_logs_user_idx on public.medication_logs (user_id, taken_on desc);

-- ============================================================
-- Featured content
-- ============================================================

create table public.featured_content (
  id uuid primary key default gen_random_uuid(),
  placement text not null default 'dashboard_hero',
  content_type text not null check (content_type in ('program','workout','exercise','goal','custom')),
  content_id uuid,
  image_asset_id uuid references public.media_assets (id) on delete set null,
  image_path text,
  headline text,
  subheading text,
  call_to_action_label text,
  call_to_action_href text,
  display_order int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- App settings (admin-managed key/value)
-- ============================================================

create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Helper functions (used by RLS and app)
-- ============================================================

create or replace function public.has_role(uid uuid, role_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = uid
      and r.key = role_key
  );
$$;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(uid, 'admin') or public.has_role(uid, 'super_admin');
$$;

-- ============================================================
-- New-user bootstrap: profile + default role + reserved
-- super-admin promotion for hello@stellio.com.au.
-- Runs as a SECURITY DEFINER trigger on auth.users, so the
-- promotion never depends on client-side logic. Idempotent:
-- ON CONFLICT DO NOTHING everywhere.
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
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    normalised_email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  select id into user_role_id from public.roles where key = 'user';
  if user_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new.id, user_role_id)
    on conflict (user_id, role_id) do nothing;
  end if;

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Safety net for accounts created before this migration (or if the
-- trigger is ever bypassed): callable on sign-in from trusted server
-- code; only ever promotes the reserved address, and is idempotent.
create or replace function public.ensure_bootstrap_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
  super_admin_role_id uuid;
begin
  select id into super_admin_role_id from public.roles where key = 'super_admin';
  if super_admin_role_id is null then
    return;
  end if;
  for u in
    select id from auth.users
    where lower(trim(email)) = 'hello@stellio.com.au'
  loop
    insert into public.user_roles (user_id, role_id)
    values (u.id, super_admin_role_id)
    on conflict (user_id, role_id) do nothing;
  end loop;
end;
$$;

-- updated_at maintenance
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
  foreach t in array array[
    'profiles','media_assets','fitness_goals','user_goals','exercises',
    'exercise_videos','programs','workout_templates','program_enrolments',
    'workout_sessions','featured_content'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;
