import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, RoleKey } from "@/lib/types";

/**
 * Server-side auth context. Role checks always go through the database
 * (user_roles joined to roles) — never a client-supplied value.
 */
export const getAuthContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null, roles: [] as RoleKey[], supabase };
  }

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("roles(key)").eq("user_id", user.id),
  ]);

  const roles = (roleRows ?? [])
    .map((r) => (r.roles as unknown as { key: string } | null)?.key)
    .filter(Boolean) as RoleKey[];

  return { user, profile: profile as Profile | null, roles, supabase };
});

export async function requireUser() {
  const ctx = await getAuthContext();
  if (!ctx.user) redirect("/login");
  return ctx;
}

export function isAdminRole(roles: RoleKey[]): boolean {
  return roles.includes("admin") || roles.includes("super_admin");
}

export function isTrainerRole(roles: RoleKey[]): boolean {
  return roles.includes("trainer");
}

/** Server-side gate for /admin routes. */
export async function requireAdmin() {
  const ctx = await requireUser();
  if (!isAdminRole(ctx.roles)) redirect("/dashboard");
  return ctx;
}

/** Server-side gate for /trainer routes. */
export async function requireTrainer() {
  const ctx = await requireUser();
  if (!isTrainerRole(ctx.roles)) redirect("/dashboard");
  return ctx;
}
