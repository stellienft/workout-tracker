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
import { MuscleSuggestions } from "@/components/progress/muscle-suggestions";
import { BodyScanUpload } from "@/components/progress/body-scan-upload";
import { BodyCompCard } from "@/components/progress/body-comp-card";
import { BodyCompTrends } from "@/components/progress/body-comp-trends";
import { getUserPlan } from "@/lib/entitlements";
import Link from "next/link";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const { user } = await requireUser();
  const supabase = await createClient();
  const { isPro } = await getUserPlan();

  const { data: prof } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const tz = prof?.timezone || DEFAULT_TZ;

  const [
    { data: metrics },
    { data: sessions },
    { count },
    { data: photoRows },
    { data: scanRows },
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
    supabase
      .from("body_composition_scans")
      .select("*")
      .eq("user_id", user.id)
      .order("scan_date", { ascending: false })
      .limit(60),
  ]);
  const scans = (scanRows ?? []) as Record<string, unknown>[];
  const latestScan = scans[0] ?? null;

  // Strength progress: set logs + exercise names, last 120 days.
  const sinceDate = new Date(Date.now() - 120 * 86_400_000).toISOString();
  const { data: setLogs } = await supabase
    .from("set_logs")
    .select("exercise_id, weight_kg, reps, session_id, created_at")
    .eq("user_id", user.id)
    .eq("completed", true)
    .gte("created_at", sinceDate)
    .order("created_at", { ascending: true })
    .limit(2000);

  // Resolve exercise names separately to avoid type issues with !inner joins.
  const exIds = Array.from(new Set((setLogs ?? []).map((l) => l.exercise_id as string).filter(Boolean)));
  const { data: exRows } = await supabase
    .from("exercises")
    .select("id, name, primary_muscles")
    .in("id", exIds.length > 0 ? exIds : ["00000000-0000-0000-0000-000000000000"]);
  const exNameById = new Map<string, string>();
  const exMusclesById = new Map<string, string[]>();
  for (const e of exRows ?? []) {
    exNameById.set(e.id as string, e.name as string);
    exMusclesById.set(e.id as string, (e.primary_muscles as string[] | null) ?? []);
  }

  const setLogsWithNames: SetLog[] = (setLogs ?? []).map((l) => ({
    exercise_id: l.exercise_id as string,
    weight_kg: l.weight_kg as number | null,
    reps: l.reps as number | null,
    session_id: l.session_id as string | null,
    created_at: l.created_at as string,
    exercises: { name: exNameById.get(l.exercise_id as string) ?? "Unknown" },
  }));

  // Muscle balance: count sets per primary muscle group from the set logs.
  const muscleSetCounts = new Map<string, number>();
  for (const l of setLogs ?? []) {
    const muscles = exMusclesById.get(l.exercise_id as string) ?? [];
    for (const m of muscles) {
      if (!m) continue;
      muscleSetCounts.set(m, (muscleSetCounts.get(m) ?? 0) + 1);
    }
  }
  const muscleBalance = buildMuscleBalance(muscleSetCounts);

  // Workout heatmap: per-day session counts for the last 120 days (16 weeks).
  const heatmapSince = new Date(Date.now() - 120 * 86_400_000).toISOString();
  const { data: heatmapSessions } = await supabase
    .from("workout_sessions")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("completed_at", heatmapSince)
    .order("completed_at", { ascending: true })
    .limit(500);
  const heatmap = buildHeatmap(heatmapSessions ?? [], tz);

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
  // Weekly workout counts (last 8 weeks).
  const weeklyCounts = buildWeeklyCounts(sessions ?? [], tz);

  const latestWeight = weightData.at(-1)?.y ?? null;

  // Strength progress: per-exercise max weight per session (top 5 most-trained).
  const strengthCharts = buildStrengthProgress(setLogsWithNames);
  // Total volume per week (last 12 weeks).
  const volumeData = buildWeeklyVolume(setLogsWithNames, tz);

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
      </div>

      <div className="mt-6">
        <WeightProgress data={weightData} tz={tz} />
      </div>

      {/* Body Composition Scan — Pro only */}
      <div className="mt-6">
        <h2 className="text-lg font-bold">Body Composition Scan</h2>
        {latestScan && (
          <div className="mt-4">
            <BodyCompCard scan={latestScan as Record<string, unknown>} />
          </div>
        )}
        {scans.length >= 2 && <BodyCompTrends scans={scans} />}
        <div className="mt-4">
          <BodyScanUpload isPro={isPro} />
        </div>
      </div>

      <div className="mt-4">
        <ProgressPhotos photos={photos} />
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
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {strengthCharts.map((ex, i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
                >
                  <LineChart data={ex.data} label={ex.name} unit=" kg" height={130} />
                </div>
              ))}
            </div>
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
              <LineChart data={volumeData} label="Total volume" unit=" kg" height={160} />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            No strength data yet. Start logging sets to see your progress.
          </p>
        )}
      </div>

      {/* Workout Heatmap */}
      <div className="mt-6">
        <h2 className="text-lg font-bold">Workout Activity</h2>
        <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <p className="mb-3 text-sm text-[var(--text-secondary)]">
            Last 16 weeks · {heatmap.totalWorkouts} workouts
          </p>
          {/* Heatmap grid: 16 columns (weeks) × 7 rows (days, Mon→Sun) */}
          <div className="flex gap-[3px] overflow-x-auto pb-1">
            {heatmap.weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => {
                  const level = day.count;
                  const opacity =
                    level === 0 ? 0.08 : level === 1 ? 0.4 : level === 2 ? 0.7 : 1;
                  return (
                    <div
                      key={di}
                      title={day.date ? `${day.date}: ${day.count} workout${day.count === 1 ? "" : "s"}` : ""}
                      className="h-[11px] w-[11px] rounded-[2px] bg-[var(--accent-primary)]"
                      style={{ opacity }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)]">16 weeks ago</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--text-muted)]">Less</span>
              {[0, 1, 2, 3].map((lvl) => (
                <div
                  key={lvl}
                  className="h-[11px] w-[11px] rounded-[2px] bg-[var(--accent-primary)]"
                  style={{
                    opacity: lvl === 0 ? 0.08 : lvl === 1 ? 0.4 : lvl === 2 ? 0.7 : 1,
                  }}
                />
              ))}
              <span className="text-[10px] text-[var(--text-muted)]">More</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">Today</span>
          </div>
        </div>
      </div>

      {/* Muscle Balance */}
      {muscleBalance.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold">Muscle Balance</h2>
          <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Percentage of total sets per muscle group (last 120 days)
            </p>
            <div className="space-y-2.5">
              {muscleBalance.map((m) => (
                <div key={m.muscle} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-xs text-[var(--text-primary)]" title={m.muscle}>
                    {m.muscle}
                  </span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded-lg bg-[var(--surface-secondary)]">
                    <div
                      className="h-full rounded-lg"
                      style={{
                        width: `${m.percent}%`,
                        backgroundColor: m.undertrained
                          ? "var(--warning)"
                          : "var(--accent-primary)",
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-medium text-[var(--text-secondary)]">
                    {m.percent}%
                  </span>
                </div>
              ))}
            </div>

            {/* Undertrained muscles section */}
            {muscleBalance.some((m) => m.undertrained) && (
              <div className="mt-5 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-4">
                <p className="text-sm font-semibold text-[var(--warning)]">
                  Undertrained muscles
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  These muscle groups make up the bottom 25% of your training volume:
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {muscleBalance
                    .filter((m) => m.undertrained)
                    .map((m) => (
                      <span
                        key={m.muscle}
                        className="inline-flex items-center rounded-full bg-[var(--warning)]/20 px-2.5 py-1 text-[11px] font-medium text-[var(--warning)]"
                      >
                        {m.muscle}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Coach Suggestions */}
          <div className="mt-4">
            <MuscleSuggestions
              undertrainedMuscles={
                muscleBalance.filter((m) => m.undertrained).map((m) => m.muscle)
              }
            />
          </div>
        </div>
      )}

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

/**
 * Build a 16-week workout heatmap. Each week is an array of 7 day-cells
 * (Mon→Sun). Cell intensity = number of completed sessions that day.
 * Aligned to the user's timezone so "today" lands on the right column.
 */
function buildHeatmap(
  sessions: { completed_at: string | null }[],
  tz: string
): { weeks: { date: string; count: number }[][]; totalWorkouts: number } {
  // Count sessions per local calendar date.
  const countByDate = new Map<string, number>();
  for (const s of sessions) {
    if (!s.completed_at) continue;
    const p = zonedParts(new Date(s.completed_at), tz);
    const key = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
    countByDate.set(key, (countByDate.get(key) ?? 0) + 1);
  }

  const totalWorkouts = sessions.length;

  // Build 16 weeks ending at the current week (Mon→Sun).
  const thisWeekStart = startOfWeekInTz(new Date(), tz);
  const NUM_WEEKS = 16;
  const weeks: { date: string; count: number }[][] = [];

  for (let w = NUM_WEEKS - 1; w >= 0; w--) {
    const weekStart = new Date(thisWeekStart.getTime() - w * 7 * 86_400_000);
    const days: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(weekStart.getTime() + d * 86_400_000);
      const p = zonedParts(dayDate, tz);
      const key = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
      // Only show counts for days up to today (no future days).
      const isFuture = dayDate.getTime() > Date.now() + 86_400_000;
      days.push({
        date: isFuture ? "" : key,
        count: isFuture ? 0 : (countByDate.get(key) ?? 0),
      });
    }
    weeks.push(days);
  }

  return { weeks, totalWorkouts };
}

/**
 * Build muscle balance data from per-muscle set counts.
 * Returns sorted (desc) bars with percentage of total sets and an
 * `undertrained` flag for the bottom 25% of muscles by volume.
 */
function buildMuscleBalance(
  muscleSetCounts: Map<string, number>
): { muscle: string; count: number; percent: number; undertrained: boolean }[] {
  const total = Array.from(muscleSetCounts.values()).reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  const sorted = Array.from(muscleSetCounts.entries())
    .map(([muscle, count]) => ({
      muscle,
      count,
      percent: Math.round((count / total) * 100),
      undertrained: false,
    }))
    .sort((a, b) => b.count - a.count);

  // Mark the bottom 25% of muscles (by count) as undertrained.
  const threshold = Math.ceil(sorted.length * 0.25);
  for (let i = sorted.length - threshold; i < sorted.length; i++) {
    if (i >= 0) sorted[i].undertrained = true;
  }

  return sorted;
}
