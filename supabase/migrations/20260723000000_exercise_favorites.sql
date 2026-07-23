-- Let members favourite exercises for quick access, mirroring recipe_favorites.
create table if not exists public.exercise_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);
alter table public.exercise_favorites enable row level security;
drop policy if exists "own exercise favorites" on public.exercise_favorites;
create policy "own exercise favorites" on public.exercise_favorites
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
