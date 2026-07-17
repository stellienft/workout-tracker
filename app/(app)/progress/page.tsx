import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { LineChart } from "@/components/ui/line-chart";
import { StatCard } from "@/components/ui/card";
import { BodyMetricsForm } from "@/components/tracking/body-metrics-form";
import Link from "next/link";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const [{ data: metrics }, { data: sessions }, { data: checkins }, { count }] =
    await Promise.all([
      supabase
        .from("body_metrics")
        .select("recorded_on, weight_kg, waist_cm")
        .eq("user_id", user.id)
        .order("recorded_on", { ascending: true })
        .limit(60),
      supabase
        .from("workout_sessions")
        .select("completed_at, total_seconds, status")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: true })
        .limit(120),
      supabase
        .from("checkins")
        .select("checked_on, shoulder_pain")
        .eq("user_id", user.id)
        .not("shoulder_pain", "is", null)
        .order("checked_on", { ascending: true })
        .limit(60),
      supabase
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed"),
    ]);

  const weightData = (metrics ?? [])
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ x: m.recorded_on, y: Number(m.weight_kg) }));
  const shoulderData = (checkins ?? []).map((c) => ({
    x: c.checked_on,
    y: Number(c.shoulder_pain),
  }));

  // Weekly workout counts (last 8 weeks).
  const weeklyCounts = buildWeeklyCounts(sessions ?? []);

  const latestWeight = weightData.at(-1)?.y ?? null;

  return (
    <PageShell>
      <PageHeader
        title="Progress"
        subtitle="Strength, body metrics, attendance and recovery."
        action={
          <Link
            href="/api/export"
            className="rounded-2xl border border-[var(--border-subtle)] px-4 py-2 text-sm"
          >
            Export data
          </Link>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Current weight"
          value={latestWeight ? `${latestWeight} kg` : "—"}
          accent
        />
        <StatCard label="Workouts" value={String(count ?? 0)} sub="completed" />
        <StatCard
          label="This month"
          value={String(countThisMonth(sessions ?? []))}
          sub="sessions"
        />
        <StatCard
          label="Shoulder"
          value={shoulderData.at(-1) ? `${shoulderData.at(-1)!.y}/10` : "—"}
          sub="latest pain"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <LineChart data={weightData} label="Body weight" unit="kg" />
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <LineChart data={shoulderData} label="Left shoulder pain" unit="/10" />
        </div>
      </div>

      <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
        <p className="mb-3 text-sm text-[var(--text-secondary)]">
          Workouts per week (last 8 weeks)
        </p>
        <div className="flex items-end gap-2" style={{ height: 120 }}>
          {weeklyCounts.map((w, i) => {
            const maxCount = Math.max(...weeklyCounts.map((x) => x.count), 1);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-[var(--accent-primary)]"
                  style={{
                    height: `${(w.count / maxCount) * 90}px`,
                    minHeight: w.count > 0 ? 6 : 2,
                    opacity: w.count > 0 ? 1 : 0.25,
                  }}
                />
                <span className="text-[10px] text-[var(--text-muted)]">{w.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-bold">Log body metrics</h2>
        <div className="mt-3">
          <BodyMetricsForm />
        </div>
      </div>
    </PageShell>
  );
}

function buildWeeklyCounts(sessions: { completed_at: string | null }[]) {
  const weeks: { label: string; count: number }[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1 - i * 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const count = sessions.filter((s) => {
      if (!s.completed_at) return false;
      const t = new Date(s.completed_at);
      return t >= start && t < end;
    }).length;
    weeks.push({
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      count,
    });
  }
  return weeks;
}

function countThisMonth(sessions: { completed_at: string | null }[]) {
  const now = new Date();
  return sessions.filter((s) => {
    if (!s.completed_at) return false;
    const t = new Date(s.completed_at);
    return t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear();
  }).length;
}
