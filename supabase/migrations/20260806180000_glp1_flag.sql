-- Whether the member is using a GLP-1 medication, captured at onboarding.
-- Powers the "For your GLP-1 journey" recommendations and tailored guidance.
alter table public.profiles
  add column if not exists glp1_medication boolean not null default false;
