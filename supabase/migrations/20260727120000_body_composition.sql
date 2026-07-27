-- ============================================================
-- Body composition scans: InBody / DEXA / Evolt results parsed
-- by AI and stored for the member. Includes a private storage
-- bucket for the uploaded scan images/PDFs.
-- Idempotent: uses create table if not exists / drop policy if exists.
-- ============================================================

-- ============================================================
-- Create ALL tables and storage bucket entries FIRST
-- (before any RLS / storage policies that reference them)
-- ============================================================

create table if not exists public.body_composition_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scan_date date not null default current_date,
  source text check (source in ('inbody','dexa','evolt','other')),
  -- Body composition metrics (all nullable — different machines report different things)
  weight_kg numeric,
  body_fat_pct numeric,
  muscle_mass_kg numeric,
  water_pct numeric,
  basal_metabolic_rate int,
  bmi numeric,
  visceral_fat_level numeric,
  bone_mass_kg numeric,
  protein_kg numeric,
  -- Segmental measurements (InBody style)
  left_arm_mass_kg numeric,
  right_arm_mass_kg numeric,
  trunk_mass_kg numeric,
  left_leg_mass_kg numeric,
  right_leg_mass_kg numeric,
  -- Raw OCR text for reference
  raw_text text,
  -- Metadata
  scan_image_path text, -- storage path to the uploaded image/PDF
  created_at timestamptz not null default now(),
  unique (user_id, scan_date)
);

create index if not exists body_composition_scans_user_date_idx
  on public.body_composition_scans (user_id, scan_date desc);

-- Storage bucket for scan uploads (private — signed URLs only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'body-scans', 'body-scans', false, 10485760, -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- Enable RLS
-- ============================================================
alter table public.body_composition_scans enable row level security;

-- ============================================================
-- RLS policies
-- ============================================================
drop policy if exists "own body scans" on public.body_composition_scans;
create policy "own body scans" on public.body_composition_scans
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- Storage policies (per-user folder isolation)
-- ============================================================
drop policy if exists "body-scans insert" on storage.objects;
create policy "body-scans insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'body-scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "body-scans select" on storage.objects;
create policy "body-scans select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'body-scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "body-scans delete" on storage.objects;
create policy "body-scans delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'body-scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
