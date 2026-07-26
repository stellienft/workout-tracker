import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { TrendingUp, Users, CreditCard, Gift, Activity } from "lucide-react";

export const metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const { roles } = await getAuthContext();
  const isSuperAdmin = roles.includes("super_admin");
  if (!isSuperAdmin && !roles.includes("admin")) return null;

  const supabase = await createClient();

  // User counts
  const [{ count: totalUsers }, { count: activeProSubs }, { count: giftedPro }, { count: pendingFriends }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("plan", "pro")
      .in("status", ["active", "trialing"]),
    supabase
      .from("free_grants")
      .select("id", { count: "exact", head: true })
      .gt("pro_until", new Date().toISOString()),
    supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  // Workout sessions (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ count: sessions30d }, { count: totalSessions }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .gte("started_at", thirtyDaysAgo)
      .eq("status", "completed"),
    supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
  ]);

  // New users in last 30 days
  const { count: newUsers30d } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo);

  // Daily signups for chart (last 14 days)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data: recentProfiles } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", fourteenDaysAgo)
    .order("created_at", { ascending: true });

  const dayMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, 0);
  }
  for (const p of recentProfiles ?? []) {
    const key = (p.created_at as string).slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  const chartData = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  // Trainer stats
  const { data: trainerRoleRows } = await supabase
    .from("roles")
    .select("id")
    .in("key", ["trainer"]);
  const trainerRoleIds = trainerRoleRows?.map((r: { id: string }) => r.id) ?? [];

  let totalTrainers = 0;
  if (trainerRoleIds.length > 0) {
    const { count } = await supabase
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .in("role_id", trainerRoleIds);
    totalTrainers = count ?? 0;
  }

  const { count: totalClients } = await supabase
    .from("trainer_clients")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  // Referrals
  const { count: totalReferrals } = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true });

  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        subtitle="Platform overview — users, subscriptions, and activity."
      />

      <div className="mt-6 space-y-6">
        {/* Top-level stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Total users"
            value={totalUsers ?? 0}
            sub={`+${newUsers30d ?? 0} last 30d`}
          />
          <StatCard
            icon={<CreditCard className="h-5 w-5" />}
            label="Active Pro subs"
            value={activeProSubs ?? 0}
            sub="Paid subscriptions"
          />
          <StatCard
            icon={<Gift className="h-5 w-5" />}
            label="Gifted Pro"
            value={giftedPro ?? 0}
            sub="Admin grants active"
          />
          <StatCard
            icon={<Activity className="h-5 w-5" />}
            label="Sessions (30d)"
            value={sessions30d ?? 0}
            sub={`${totalSessions ?? 0} all time`}
          />
        </div>

        {/* Signups chart */}
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[var(--accent-primary)]" />
            <p className="font-semibold">New signups (last 14 days)</p>
          </div>
          <div className="mt-6 flex items-end gap-1.5 h-32">
            {chartData.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-[var(--accent-primary)] transition-all min-h-[2px]"
                  style={{ height: `${(d.count / maxCount) * 100}%` }}
                  title={`${d.date}: ${d.count} signup${d.count === 1 ? "" : "s"}`}
                />
                <span className="text-[9px] text-[var(--text-muted)]">
                  {d.date.slice(5).replace("-", "/")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Trainers"
            value={totalTrainers ?? 0}
            sub="With trainer role"
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Active clients"
            value={totalClients ?? 0}
            sub="Trainer-client links"
          />
          <StatCard
            icon={<Gift className="h-5 w-5" />}
            label="Pending friend reqs"
            value={pendingFriends ?? 0}
            sub="Awaiting response"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Referrals"
            value={totalReferrals ?? 0}
            sub="Total referred"
          />
        </div>

        {/* Conversion funnel */}
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <p className="font-semibold">Conversion funnel</p>
          <div className="mt-4 space-y-3">
            <FunnelRow
              label="Total users"
              value={totalUsers ?? 0}
              max={totalUsers ?? 1}
            />
            <FunnelRow
              label="Completed onboarding"
              value={totalSessions ?? 0 > 0 ? totalUsers ?? 0 : 0}
              max={totalUsers ?? 1}
              hint="Users who logged at least 1 session"
            />
            <FunnelRow
              label="Active Pro (paid)"
              value={activeProSubs ?? 0}
              max={totalUsers ?? 1}
            />
            <FunnelRow
              label="Active Pro (gifted)"
              value={giftedPro ?? 0}
              max={totalUsers ?? 1}
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
      <div className="flex items-center gap-2 text-[var(--accent-primary)]">
        {icon}
        <span className="text-xs font-medium text-[var(--text-muted)]">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-[var(--text-muted)]">{sub}</p>
    </div>
  );
}

function FunnelRow({
  label,
  value,
  max,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  hint?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-medium">
          {value.toLocaleString()} <span className="text-xs text-[var(--text-muted)]">({pct}%)</span>
        </span>
      </div>
      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-secondary)]">
        <div
          className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint && <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
