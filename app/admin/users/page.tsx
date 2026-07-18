import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import { UserRoleControls } from "@/components/admin/user-role-controls";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { roles: myRoles } = await getAuthContext();
  const isSuperAdmin = myRoles.includes("super_admin");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

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

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        {isSuperAdmin
          ? "Assign or remove admin roles. Role changes are enforced server-side."
          : "Only a super administrator can change roles."}
      </p>

      <div className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-secondary)] text-left text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Roles</th>
              {isSuperAdmin && <th className="p-3">Manage</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {profiles?.map((p) => {
              const userRoles = rolesByUser.get(p.id) ?? ["user"];
              return (
                <tr key={p.id} className="bg-[var(--surface-primary)]">
                  <td className="p-3">
                    <p className="font-medium">{p.full_name || "—"}</p>
                    <p className="text-xs text-[var(--text-muted)]">{p.email}</p>
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
  );
}
