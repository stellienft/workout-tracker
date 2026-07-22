-- Recipes had only a read policy, so admin imports (Spoonacular seed/import)
-- failed with "new row violates row-level security policy for table recipes".
-- Let admins insert/update/delete recipes; everyone signed in still just reads.
drop policy if exists "admins manage recipes" on public.recipes;
create policy "admins manage recipes" on public.recipes
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
