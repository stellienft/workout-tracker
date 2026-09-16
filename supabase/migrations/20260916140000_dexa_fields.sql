-- Capture DEXA-specific metrics that the InBody-oriented schema dropped, and
-- normalise any lean/fat/bone masses that were stored in grams instead of kg.
alter table public.body_composition_scans
  add column if not exists fat_mass_kg numeric,
  add column if not exists lean_mass_kg numeric,
  add column if not exists bone_mineral_kg numeric,
  add column if not exists vat_mass_kg numeric,        -- visceral adipose tissue
  add column if not exists android_fat_pct numeric,
  add column if not exists gynoid_fat_pct numeric;

-- Repair historical rows: DEXA machines report regional/lean mass in grams, and
-- an earlier extraction stored them verbatim. Any body-mass value over 500 (kg)
-- is really grams — divide by 1000. (Bodyweight is never affected.)
update public.body_composition_scans set muscle_mass_kg   = muscle_mass_kg   / 1000 where muscle_mass_kg   > 500;
update public.body_composition_scans set lean_mass_kg     = lean_mass_kg     / 1000 where lean_mass_kg     > 500;
update public.body_composition_scans set fat_mass_kg      = fat_mass_kg      / 1000 where fat_mass_kg      > 500;
update public.body_composition_scans set bone_mass_kg     = bone_mass_kg     / 1000 where bone_mass_kg     > 500;
update public.body_composition_scans set bone_mineral_kg  = bone_mineral_kg  / 1000 where bone_mineral_kg  > 500;
update public.body_composition_scans set protein_kg       = protein_kg       / 1000 where protein_kg       > 500;
update public.body_composition_scans set left_arm_mass_kg  = left_arm_mass_kg  / 1000 where left_arm_mass_kg  > 500;
update public.body_composition_scans set right_arm_mass_kg = right_arm_mass_kg / 1000 where right_arm_mass_kg > 500;
update public.body_composition_scans set trunk_mass_kg     = trunk_mass_kg     / 1000 where trunk_mass_kg     > 500;
update public.body_composition_scans set left_leg_mass_kg  = left_leg_mass_kg  / 1000 where left_leg_mass_kg  > 500;
update public.body_composition_scans set right_leg_mass_kg = right_leg_mass_kg / 1000 where right_leg_mass_kg > 500;
