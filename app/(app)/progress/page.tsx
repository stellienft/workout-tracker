import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { LineChart } from "@/components/ui/line-chart";
import { StatCard } from "@/components/ui/card";
import { BodyMetricsForm } from "@/components/tracking/body-metrics-form";
import { WeightProgress } from "@/components/progress/weight-progress";
import {
  ProgressPhotos,
  type ProgressPhoto,
} from "@/components/progress/progress-photos";
import { DEFAULT_TZ, startOfWeekInTz, zonedParts } from "@/lib/timezone";
import Link from "next/link";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: prof } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const tz = prof?.timezone || DEFAULT_TZ;

  const [
    { data: metrics },
    { data: sessions },
    { data: checkins },
    { count },
    { data: photoRows },
  ] = await Promise.all([
    supabase
      .from("body_metrics")
      .select("recorded_on, weight_kg, waist_cm")
      .eq("user_id", user.id)
      .order("recorded_on", { ascending: true })
      .limit(1000),
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
    supabase
      .from("progress_photos")
      .select("id, storage_path, pose, taken_on, weight_kg, note")
      .eq("user_id", user.id)
      .order("taken_on", { ascending: false })
      .limit(200),
  ]);

  // Strength progress: set logs joined with exercises, last 120 days.
  const sinceDate = new Date(Date.now() - 120 * 86_400_000).toISOString();
  const { data: setLogs } = await supabase
    .from("set_logs")
    .select(
      "exercise_id, weight_kg, reps, session_id, created_at, exercises!inner(name)"
    )
    .eq("user_id", user.id)
    .eq("completed", true)
    .gte("created_at", sinceDate)
    .order("created_at", { ascending: true })
    .limit(2000);

  // Progress photos live in a private bucket — mint short-lived signed URLs.
  const photos: ProgressPhoto[] = [];
  if (photoRows && photoRows.length > 0) {
    const { data: signed } = await supabase.storage
      .from("progress-photos")
      .createSignedUrls(
        photoRows.map((p) => p.storage_path),
        60 * 60 // 1 hour
      );
    const urlByPath = new Map(
      (signed ?? [])
        .filter((s) => s.signedUrl && s.path)
        .map((s) => [s.path as string, s.signedUrl])
    );
    for (const p of photoRows) {
      const url = urlByPath.get(p.storage_path);
      if (!url) continue;
      photos.push({
        id: p.id,
        url,
        pose: p.pose,
        takenOn: p.taken_on,
        weightKg: p.weight_kg != null ? Number(p.weight_kg) : null,
        note: p.note,
      });
    }
  }

  const weightData = (metrics ?? [])
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ x: m.recorded_on, y: Number(m.weight_kg) }));
  const shoulderData = (checkins ?? []).map((c) => ({
    x: c.checked_on,
    y: Number(c.shoulder_pain),
  }));

  // Weekly workout counts (last 8 weeks).
  const weeklyCounts = buildWeeklyCounts(sessions ?? [], tz);

  const latestWeight = weightData.at(-1)?.y ?? null;

  // Strength progress: per-exercise max weight per session (top 5 most-trained).
  const strengthCharts = buildStrengthProgress(setLogs ?? []);
  // Total volume per week (last 12 weeks).
  const volumeData = buildWeeklyVolume(setLogs ?? [], tz);

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
          value={String(countThisMonth(sessions ?? [], tz))}
          sub="sessions"
        />
        <StatCard
          label="Shoulder"
          value={shoulderData.at(-1) ? `${shoulderData.at(-1)!.y}/10` : "—"}
          sub="latest pain"
        />
      </div>

      <div className="mt-6">
        <WeightProgress data={weightData} tz={tz} />
      </div>

      <div className="mt-4">
        <ProgressPhotos photos={photos} />
      </div>

      <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
        <LineChart data={shoulderData} label="Left shoulder pain" unit="/10" />
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

      {/* Strength Progress */}
      <div className="mt-6">
        <h2 className="text-lg font-bold">Strength Progress</h2>
        {strengthCharts.length > 0 ? (
          <div className="mt-3 space-y-4">
            {strengthCharts.map((ex, i) => (
              <div
                key={i}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5"
              >
                <LineChart data={ex.data} label={ex.name} unit=" kg" />
              </div>
            ))}
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
              <LineChart data={volumeData} label="Total volume" unit=" kg" />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            No strength data yet. Start logging sets to see your progress.
          </p>
        )}
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

function buildWeeklyCounts(
  sessions: { completed_at: string | null }[],
  tz: string
) {
  const weeks: { label: string; count: number }[] = [];
  const thisWeekStart = startOfWeekInTz(new Date(), tz);
  for (let i = 7; i >= 0; i--) {
    const start = new Date(thisWeekStart.getTime() - i * 7 * 86_400_000);
    const end = new Date(start.getTime() + 7 * 86_400_000);
    const count = sessions.filter((s) => {
      if (!s.completed_at) return false;
      const t = new Date(s.completed_at);
      return t >= start && t < end;
    }).length;
    const p = zonedParts(start, tz);
    weeks.push({ label: `${p.month}/${p.day}`, count });
  }
  return weeks;
}

function countThisMonth(
  sessions: { completed_at: string | null }[],
  tz: string
) {
  const now = zonedParts(new Date(), tz);
  return sessions.filter((s) => {
    if (!s.completed_at) return false;
    const t = zonedParts(new Date(s.completed_at), tz);
    return t.month === now.month && t.year === now.year;
  }).length;
}

type SetLog = {
  exercise_id: string;
  weight_kg: number | null;
  reps: number | null;
  session_id: string | null;
  created_at: string;
  exercises: { name: string } | null;
};

/**
 * Build per-exercise strength progress: for each exercise, the max weight lifted
 * per session over time. Returns the top 5 most-trained exercises (by session count).
 */
function buildStrengthProgress(
  sets: SetLog[]
): { name: string; data: { x: string; y: number }[] }[] {
  // Group by exercise, then by session to find max weight per session.
  const byExercise = new Map<
    string,
    { name: string; sessions: Map<string, { date: string; maxWeight: number }> }
  >();

  for (const s of sets) {
    if (!s.exercise_id || !s.exercises?.name) continue;
    const weight = s.weight_kg != null ? Number(s.weight_kg) : 0;
    const sessionKey = s.session_id ?? s.created_at;

    if (!byExercise.has(s.exercise_id)) {
      byExercise.set(s.exercise_id, {
        name: s.exercises.name,
        sessions: new Map(),
      });
    }
    const ex = byExercise.get(s.exercise_id)!;

    if (!ex.sessions.has(sessionKey)) {
      ex.sessions.set(sessionKey, { date: s.created_at, maxWeight: weight });
    } else {
      const existing = ex.sessions.get(sessionKey)!;
      if (weight > existing.maxWeight) {
        existing.maxWeight = weight;
      }
    }
  }

  // Rank exercises by number of sessions (most-trained first), take top 5.
  return Array.from(byExercise.entries())
    .map(([, { name, sessions }]) => ({
      name,
      sessionCount: sessions.size,
      data: Array.from(sessions.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((s) => ({ x: s.date, y: s.maxWeight })),
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, 5)
    .map(({ name, data }) => ({ name, data }));
}

/**
 * Build total volume per week (sum of weight × reps) for the last 12 weeks.
 * Weeks are Mon–Sun, aligned to the user's timezone.
 */
function buildWeeklyVolume(
  sets: { weight_kg: number | null; reps: number | null; created_at: string }[],
  tz: string
): { x: string; y: number }[] {
  const thisWeekStart = startOfWeekInTz(new Date(), tz);
  const weeks: { start: Date; end: Date; volume: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(thisWeekStart.getTime() - i * 7 * 86_400_000);
    const end = new Date(start.getTime() + 7 * 86_400_000);
    weeks.push({ start, end, volume: 0 });
  }

  for (const s of sets) {
    const t = new Date(s.created_at);
    const weight = s.weight_kg != null ? Number(s.weight_kg) : 0;
    const reps = s.reps != null ? Number(s.reps) : 0;
    const volume = weight * reps;
    for (const w of weeks) {
      if (t >= w.start && t < w.end) {
        w.volume += volume;
        break;
      }
    }
  }

  return weeks.map((w) => ({
    x: w.start.toISOString().slice(0, 10),
    y: Math.round(w.volume),
  }));
}
