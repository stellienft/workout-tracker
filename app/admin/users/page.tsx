import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import { UserRoleControls } from "@/components/admin/user-role-controls";
import { UserResetPassword } from "@/components/admin/user-reset-password";
import { GiftSubscription } from "@/components/admin/gift-subscription";
import { UserSearch } from "@/components/admin/user-search";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const { roles: myRoles } = await getAuthContext();
  const isSuperAdmin = myRoles.includes("super_admin");
  const { q, page } = await searchParams;
  const query = q?.trim() ?? "";
  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = 25;

  let profilesQuery = supabase
    .from("profiles")
    .select("id, email, full_name, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((pageNum - 1) * perPage, pageNum * perPage - 1);

  if (query) {
    profilesQuery = profilesQuery.or(
      `email.ilike.%${query}%,full_name.ilike.%${query}%`
    );
  }

  const { data: profiles, count } = await profilesQuery;

  // Roles
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("user_id, roles(key)");

  const rolesByUser = new Map<string, string[]>();
  for (const r of roleRows ?? []) {
    const key = (r.roles as unknown as { key: string } | null)?.key;
    if (!key) continue;
    const list = rolesByUser.get(r.user_id as string) ?? [];
    list.push(key);
    rolesByUser.set(r.user_id as string, list);
  }

  // Subscriptions
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("user_id, plan, status, current_period_end");

  const subByUser = new Map<
    string,
    { plan: string; status: string; current_period_end: string | null }
  >();
  for (const s of subs ?? []) {
    subByUser.set(s.user_id as string, {
      plan: s.plan as string,
      status: s.status as string,
      current_period_end: s.current_period_end as string | null,
    });
  }

  // Free grants
  const { data: grants } = await supabase
    .from("free_grants")
    .select("user_id, pro_until, reason");

  const grantByUser = new Map<string, string>();
  for (const g of grants ?? []) {
    grantByUser.set(g.user_id as string, g.pro_until as string);
  }

  const totalPages = Math.ceil((count ?? 0) / perPage);
  const userCount = count ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {userCount.toLocaleString()} total · {isSuperAdmin ? "Super admin — full access" : "Admin — view + password reset"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Suspense fallback={<div className="h-10 w-full max-w-md rounded-xl bg-[var(--surface-secondary)]" />}>
          <UserSearch initialQuery={query} initialPage={pageNum} />
        </Suspense>
      </div>

      <div className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-secondary)] text-left text-xs uppercase text-[var(--text-muted)]">
              <tr>
                <th className="p-3 whitespace-nowrap">User</th>
                <th className="p-3 whitespace-nowrap">Roles</th>
                <th className="p-3 whitespace-nowrap">Plan</th>
                <th className="p-3 whitespace-nowrap">Gifted Pro</th>
                <th className="p-3 whitespace-nowrap">Account</th>
                {isSuperAdmin && <th className="p-3 whitespace-nowrap">Manage</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {profiles?.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="p-8 text-center text-[var(--text-muted)]">
                    No users found{query ? ` for "${query}"` : ""}.
                  </td>
                </tr>
              )}
              {profiles?.map((p) => {
                const userRoles = rolesByUser.get(p.id) ?? ["user"];
                const sub = subByUser.get(p.id);
                const grant = grantByUser.get(p.id) ?? null;
                const grantActive = grant && new Date(grant).getTime() > Date.now();

                return (
                  <tr key={p.id} className="bg-[var(--surface-primary)]">
                    <td className="p-3">
                      <p className="font-medium">{p.full_name || "—"}</p>
                      <p className="text-xs text-[var(--text-muted)]">{p.email}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {userRoles.map((r) => (
                          <span
                            key={r}
                            className={`rounded-full px-2 py-0.5 text-[11px] ${
                              r === "super_admin"
                                ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                                : r === "admin"
                                  ? "bg-[var(--surface-elevated)] text-[var(--warning)]"
                                  : "bg-[var(--surface-elevated)] text-[var(--text-secondary)]"
                            }`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      {sub?.plan === "pro" && (sub.status === "active" || sub.status === "trialing") ? (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent-primary)]">
                            Pro
                          </span>
                          {sub.current_period_end && (
                            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                              until {new Date(sub.current_period_end).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : grantActive ? (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent-primary)]">
                            Pro (gifted)
                          </span>
                          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                            until {new Date(grant!).toLocaleDateString()}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">Free</span>
                      )}
                    </td>
                    <td className="p-3">
                      <GiftSubscription userId={p.id} currentGrant={grantActive ? grant : null} />
                    </td>
                    <td className="p-3">
                      <UserResetPassword userId={p.id} email={p.email} />
                    </td>
                    {isSuperAdmin && (
                      <td className="p-3">
                        <UserRoleControls
                          userId={p.id}
                          isAdmin={userRoles.includes("admin")}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            Page {pageNum} of {totalPages}
          </p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <a
                href={`/admin/users?q=${encodeURIComponent(query)}&page=${pageNum - 1}`}
                className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs hover:border-[var(--border-active)]"
              >
                ← Prev
              </a>
            )}
            {pageNum < totalPages && (
              <a
                href={`/admin/users?q=${encodeURIComponent(query)}&page=${pageNum + 1}`}
                className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs hover:border-[var(--border-active)]"
              >
                Next →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
