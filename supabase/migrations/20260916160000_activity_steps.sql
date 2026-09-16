-- Steps for imported/logged activities (e.g. walking-pad sessions).
alter table public.external_activities
  add column if not exists steps int;
