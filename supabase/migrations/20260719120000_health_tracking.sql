-- Stellio Fit — general health & symptom tracking.
-- Generalises the Mounjaro-only section: members pick which symptoms / vitals
-- / lifestyle factors they want to follow (from a seeded catalog, plus custom
-- ones) and log them easily over time.

-- ============================================================
-- Catalog of trackable metrics (seeded, admin-extendable)
-- ============================================================
create table public.health_metrics (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  category text not null default 'symptom'
    check (category in ('symptom','vital','lifestyle','wellbeing')),
  input_type text not null default 'scale'
    check (input_type in ('scale','number','boolean')),
  scale_min int not null default 0,
  scale_max int not null default 10,
  unit text,
  description text,
  icon text,
  medication_related boolean not null default false,
  display_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- A member's chosen trackers (catalog reference OR custom)
-- ============================================================
create table public.user_health_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  metric_id uuid references public.health_metrics (id) on delete cascade,
  custom_name text,
  custom_input_type text
    check (custom_input_type in ('scale','number','boolean')),
  custom_scale_min int,
  custom_scale_max int,
  custom_unit text,
  enabled boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- either a catalog metric or a custom one
  check (metric_id is not null or custom_name is not null)
);

-- One tracker row per catalog metric per user
create unique index user_health_metrics_unique_catalog
  on public.user_health_metrics (user_id, metric_id)
  where metric_id is not null;

create index user_health_metrics_user_idx
  on public.user_health_metrics (user_id);

-- ============================================================
-- Daily log entries (one value per tracker per day)
-- ============================================================
create table public.health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_health_metric_id uuid not null
    references public.user_health_metrics (id) on delete cascade,
  logged_on date not null default current_date,
  value_numeric numeric,
  value_bool boolean,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_health_metric_id, logged_on)
);

create index health_logs_user_idx on public.health_logs (user_id, logged_on desc);

-- updated_at maintenance (reuses existing public.set_updated_at)
create trigger set_updated_at before update on public.user_health_metrics
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.health_logs
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.health_metrics enable row level security;
alter table public.user_health_metrics enable row level security;
alter table public.health_logs enable row level security;

create policy "read active health metrics" on public.health_metrics
  for select to authenticated using (active or public.is_admin(auth.uid()));

create policy "admins manage health metrics" on public.health_metrics
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "own health trackers" on public.user_health_metrics
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own health logs" on public.health_logs
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- Seed the catalog
-- ============================================================
insert into public.health_metrics
  (key, name, category, input_type, scale_min, scale_max, unit, medication_related, display_order)
values
  -- GLP-1 / medication-related symptoms
  ('nausea','Nausea','symptom','scale',0,10,null,true,1),
  ('appetite','Appetite','symptom','scale',0,10,null,true,2),
  ('cravings','Food cravings','symptom','scale',0,10,null,true,3),
  ('fatigue','Fatigue','symptom','scale',0,10,null,true,4),
  ('headache','Headache','symptom','scale',0,10,null,true,5),
  ('constipation','Constipation','symptom','scale',0,10,null,true,6),
  ('heartburn','Heartburn / reflux','symptom','scale',0,10,null,true,7),
  ('bloating','Bloating','symptom','scale',0,10,null,true,8),
  ('dizziness','Dizziness','symptom','scale',0,10,null,true,9),
  ('injection_site_reaction','Injection site reaction','symptom','scale',0,10,null,true,10),
  -- General symptoms
  ('joint_pain','Joint pain','symptom','scale',0,10,null,false,20),
  ('muscle_soreness','Muscle soreness','symptom','scale',0,10,null,false,21),
  ('shoulder_pain','Shoulder pain','symptom','scale',0,10,null,false,22),
  ('anxiety','Anxiety','wellbeing','scale',0,10,null,false,23),
  ('mood','Mood','wellbeing','scale',1,5,null,false,24),
  ('energy','Energy','wellbeing','scale',1,5,null,false,25),
  ('sleep_quality','Sleep quality','wellbeing','scale',1,5,null,false,26),
  ('stress','Stress','wellbeing','scale',0,10,null,false,27),
  -- Vitals / numeric
  ('weight','Weight','vital','number',0,0,'kg',false,40),
  ('resting_heart_rate','Resting heart rate','vital','number',0,0,'bpm',false,41),
  ('systolic_bp','Blood pressure (systolic)','vital','number',0,0,'mmHg',false,42),
  ('diastolic_bp','Blood pressure (diastolic)','vital','number',0,0,'mmHg',false,43),
  ('blood_glucose','Blood glucose','vital','number',0,0,'mmol/L',false,44),
  ('sleep_hours','Sleep','lifestyle','number',0,0,'hours',false,50),
  ('water_intake','Water intake','lifestyle','number',0,0,'L',false,51),
  ('steps','Steps','lifestyle','number',0,0,'steps',false,52),
  ('alcohol','Alcohol','lifestyle','number',0,0,'drinks',false,53),
  ('medication_taken','Medication taken today','lifestyle','boolean',0,1,null,true,60)
on conflict (key) do nothing;
