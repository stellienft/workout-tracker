-- Track where a recipe came from so imports (e.g. Spoonacular) dedupe cleanly
-- and stay distinguishable from the hand-seeded library.
alter table public.recipes
  add column if not exists source text not null default 'seed',
  add column if not exists external_id text;

-- One row per external recipe id. A plain unique index (not partial) is used so
-- upserts can target ON CONFLICT (external_id); multiple NULLs are allowed for
-- the hand-seeded rows.
create unique index if not exists recipes_external_id_key
  on public.recipes (external_id);
