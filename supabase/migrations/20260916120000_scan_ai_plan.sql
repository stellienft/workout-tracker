-- Persist the AI training focus generated from a body-composition scan, so it
-- stays attached to that scan and doesn't need regenerating on every visit.
alter table public.body_composition_scans
  add column if not exists ai_plan jsonb,
  add column if not exists ai_plan_generated_at timestamptz;
