-- Track imported exercises (e.g. from wger) so they dedupe and stay
-- distinguishable from the hand-curated library.
alter table public.exercises
  add column if not exists source text not null default 'seed',
  add column if not exists external_id text;

create unique index if not exists exercises_external_id_key
  on public.exercises (external_id);
