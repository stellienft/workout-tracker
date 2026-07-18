-- Stellio Fit — Row Level Security
-- Principles:
--  * Users read published system content; admins manage it.
--  * Users only touch their own rows (enrolments, logs, check-ins, metrics).
--  * Roles are read-only for users; assignment happens only via trusted
--    server-side code (SECURITY DEFINER trigger / service role).
--  * Client-provided role values are never trusted anywhere.

alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.media_assets enable row level security;
alter table public.fitness_goals enable row level security;
alter table public.user_goals enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_alternatives enable row level security;
alter table public.exercise_videos enable row level security;
alter table public.programs enable row level security;
alter table public.program_weeks enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.program_enrolments enable row level security;
alter table public.saved_programs enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;
alter table public.pain_reports enable row level security;
alter table public.body_metrics enable row level security;
alter table public.checkins enable row level security;
alter table public.medication_logs enable row level security;
alter table public.featured_content enable row level security;
alter table public.app_settings enable row level security;

-- ---------- roles / user_roles ----------
create policy "roles are readable by authenticated users"
  on public.roles for select to authenticated using (true);

create policy "users can read their own role assignments"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- Only super admins may assign roles from the client; the bootstrap
-- trigger runs as SECURITY DEFINER and bypasses RLS.
create policy "super admins manage role assignments"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- ---------- profiles ----------
create policy "users read own profile, admins read all"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()));

create policy "users update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "admins update any profile"
  on public.profiles for update to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------- system content: read published, admin manage ----------
create policy "read published goals" on public.fitness_goals
  for select to authenticated
  using (active or public.is_admin(auth.uid()));

create policy "admins manage goals" on public.fitness_goals
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read published programs" on public.programs
  for select to authenticated
  using (status = 'published' or public.is_admin(auth.uid()));

create policy "admins manage programs" on public.programs
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read weeks of published programs" on public.program_weeks
  for select to authenticated
  using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.programs p
      where p.id = program_id and p.status = 'published'
    )
  );

create policy "admins manage program weeks" on public.program_weeks
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read templates of published programs" on public.workout_templates
  for select to authenticated
  using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.programs p
      where p.id = program_id and p.status = 'published'
    )
  );

create policy "admins manage workout templates" on public.workout_templates
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read template exercises of published programs"
  on public.workout_template_exercises
  for select to authenticated
  using (
    public.is_admin(auth.uid()) or exists (
      select 1
      from public.workout_templates wt
      join public.programs p on p.id = wt.program_id
      where wt.id = workout_template_id and p.status = 'published'
    )
  );

create policy "admins manage template exercises"
  on public.workout_template_exercises
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read published exercises" on public.exercises
  for select to authenticated
  using (status = 'published' or public.is_admin(auth.uid()));

create policy "admins manage exercises" on public.exercises
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read exercise alternatives" on public.exercise_alternatives
  for select to authenticated using (true);

create policy "admins manage exercise alternatives" on public.exercise_alternatives
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read active exercise videos" on public.exercise_videos
  for select to authenticated
  using (active or public.is_admin(auth.uid()));

create policy "admins manage exercise videos" on public.exercise_videos
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read published media" on public.media_assets
  for select to authenticated
  using (status = 'published' or owner_user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "admins manage media" on public.media_assets
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read active featured content" on public.featured_content
  for select to authenticated
  using (active or public.is_admin(auth.uid()));

create policy "admins manage featured content" on public.featured_content
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read app settings" on public.app_settings
  for select to authenticated using (true);

create policy "admins manage app settings" on public.app_settings
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------- per-user data: owner-only ----------
create policy "own user goals" on public.user_goals
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own enrolments" on public.program_enrolments
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own saved programs" on public.saved_programs
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own workout sessions" on public.workout_sessions
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own set logs" on public.set_logs
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own pain reports" on public.pain_reports
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own body metrics" on public.body_metrics
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own checkins" on public.checkins
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own medication logs" on public.medication_logs
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- storage: media bucket ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "public read media bucket"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "admins write media bucket"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin(auth.uid()));

create policy "admins update media bucket"
  on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin(auth.uid()));

create policy "admins delete media bucket"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin(auth.uid()));
