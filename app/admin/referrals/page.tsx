import { getAuthContext } from "@/lib/auth";
import { serviceSupabase } from "@/lib/push";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { Gift, Users, Trophy } from "lucide-react";

export const metadata = { title: "Referrals" };

interface Prof {
  full_name: string | null;
  email: string | null;
}

export default async function AdminReferralsPage() {
  const { roles } = await getAuthContext();
  if (!roles.includes("super_admin") && !roles.includes("admin")) return null;

  // Referrals RLS only exposes a member's own rows; admins need the full set,
  // so read via the service role (this page is already admin-gated).
  const svc = serviceSupabase();
  const { data: refs } = await svc
    .from("referrals")
    .select("referrer_user_id, referred_user_id, code, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);

  const rows = refs ?? [];
  const ids = Array.from(
    new Set(
      rows.flatMap((r) => [r.referrer_user_id as string, r.referred_user_id as string])
    )
  );
  const profById = new Map<string, Prof>();
  if (ids.length > 0) {
    const { data: profs } = await svc
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    for (const p of profs ?? [])
      profById.set(p.id as string, {
        full_name: (p.full_name as string | null) ?? null,
        email: (p.email as string | null) ?? null,
      });
  }
  const nameOf = (id: string) =>
    profById.get(id)?.full_name || profById.get(id)?.email || "Unknown member";

  // Leaderboard: referrers by number of successful referrals.
  const counts = new Map<string, number>();
  for (const r of rows) {
    const id = r.referrer_user_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const leaderboard = Array.from(counts.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-AU");

  return (
    <PageShell>
      <PageHeader
        title="Referrals"
        subtitle="Who referred whom across the platform."
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat icon={<Gift className="h-4 w-4" />} label="Total referrals" value={rows.length} />
        <Stat icon={<Users className="h-4 w-4" />} label="Referrers" value={leaderboard.length} />
        <Stat
          icon={<Trophy className="h-4 w-4" />}
          label="Top referrer"
          value={leaderboard[0]?.count ?? 0}
          sub={leaderboard[0] ? nameOf(leaderboard[0].id) : undefined}
        />
      </div>

      {/* Leaderboard */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Top referrers</h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No referrals yet.</p>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
            {leaderboard.map((l, i) => (
              <div key={l.id} className="flex items-center gap-3 p-4">
                <span className="w-6 shrink-0 text-center text-sm font-bold text-[var(--text-muted)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{nameOf(l.id)}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {profById.get(l.id)?.email ?? ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--accent-muted)] px-3 py-1 text-sm font-semibold text-[var(--accent-primary)]">
                  {l.count} referred
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent referrals */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold">All referrals</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No referrals yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="p-3 font-medium">Referred member</th>
                  <th className="p-3 font-medium">Referred by</th>
                  <th className="p-3 font-medium">Code</th>
                  <th className="p-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.referred_user_id}-${i}`}
                    className="border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <td className="p-3">
                      <p className="font-medium">{nameOf(r.referred_user_id as string)}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {profById.get(r.referred_user_id as string)?.email ?? ""}
                      </p>
                    </td>
                    <td className="p-3">{nameOf(r.referrer_user_id as string)}</td>
                    <td className="p-3 font-mono text-xs text-[var(--text-secondary)]">
                      {r.code as string}
                    </td>
                    <td className="p-3 whitespace-nowrap text-[var(--text-muted)]">
                      {fmt(r.created_at as string)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
      <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="truncate text-xs text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
}
