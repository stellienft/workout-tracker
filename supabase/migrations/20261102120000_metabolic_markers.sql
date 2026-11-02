-- Metabolic health / insulin-resistance tracking.
-- Members log lab markers (as a set per blood draw) + waist; the app derives
-- HOMA-IR, TG:HDL and waist-to-height. Educational tracking, not a diagnosis.

create table if not exists public.metabolic_markers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recorded_on date not null default current_date,
  fasting_glucose_mmol numeric,
  fasting_insulin_uu numeric,
  hba1c_pct numeric,
  triglycerides_mmol numeric,
  hdl_mmol numeric,
  waist_cm numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists metabolic_markers_user_date_idx
  on public.metabolic_markers (user_id, recorded_on);

alter table public.metabolic_markers enable row level security;

create policy "metabolic_select_own" on public.metabolic_markers
  for select to authenticated using (user_id = auth.uid());
create policy "metabolic_insert_own" on public.metabolic_markers
  for insert to authenticated with check (user_id = auth.uid());
create policy "metabolic_update_own" on public.metabolic_markers
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "metabolic_delete_own" on public.metabolic_markers
  for delete to authenticated using (user_id = auth.uid());

-- Height (for waist-to-height) + opt-in flag for the metabolic reminder nudges.
alter table public.profiles
  add column if not exists height_cm numeric,
  add column if not exists metabolic_reminders_enabled boolean not null default false;
