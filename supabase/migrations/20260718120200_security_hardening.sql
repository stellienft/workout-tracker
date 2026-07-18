-- Stellio Fit — security hardening (from Supabase advisor review).
--
-- Applied to the hosted project via MCP; kept here so local `db reset`
-- and CI stay in sync with production.

-- Pin search_path on the last helper that lacked it.
alter function public.set_updated_at() set search_path = '';

-- Trigger/bootstrap functions must never be reachable via PostgREST RPC.
-- (The signup trigger still fires — it runs as the table owner.)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.ensure_bootstrap_admin() from public, anon, authenticated;

-- RLS helper functions: signed-in users need EXECUTE for policy evaluation,
-- but anonymous callers never do. (The residual "authenticated can execute"
-- advisor note is expected for RLS helpers and accepted.)
revoke execute on function public.has_role(uuid, text) from public, anon;
grant execute on function public.has_role(uuid, text) to authenticated;

revoke execute on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;

-- Public bucket: object URLs resolve without a broad SELECT policy on
-- storage.objects. Dropping it stops clients from listing every file.
drop policy if exists "public read media bucket" on storage.objects;
