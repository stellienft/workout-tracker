-- Let members import their own recipes from a link. Imported recipes are
-- private to the member who added them; the seeded library stays public.

alter table public.recipes
  add column if not exists owner_id uuid references auth.users (id) on delete cascade,
  add column if not exists source_url text;

create index if not exists recipes_owner_idx on public.recipes (owner_id);

-- Read: everyone signed in sees the public library (owner_id null) plus their
-- own imports.
drop policy if exists "anyone signed in reads recipes" on public.recipes;
drop policy if exists "read public or own recipes" on public.recipes;
create policy "read public or own recipes" on public.recipes
  for select to authenticated
  using (owner_id is null or owner_id = auth.uid());

-- Write: members may manage only their own recipes. The existing
-- "admins manage recipes" policy still covers the shared library.
drop policy if exists "members manage own recipes" on public.recipes;
create policy "members manage own recipes" on public.recipes
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
