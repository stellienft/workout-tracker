-- Let members favourite recipes for quick re-adding.
create table if not exists public.recipe_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);
alter table public.recipe_favorites enable row level security;
drop policy if exists "own recipe favorites" on public.recipe_favorites;
create policy "own recipe favorites" on public.recipe_favorites
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
