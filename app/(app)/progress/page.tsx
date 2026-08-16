import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { LineChart } from "@/components/ui/line-chart";
import { MultiLineChart } from "@/components/ui/multi-line-chart";
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
import {
  MusclePreservation,
  type PreservationInsight,
} from "@/components/progress/muscle-preservation";
import {
  WellnessProgress,
  type WellnessSummary,
} from "@/components/progress/wellness-progress";
import { getUserPlan } from "@/lib/entitlements";
import { Download } from "lucide-react";
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

  // Muscle preservation: body-weight trend vs a composite strength trend, plus
  // a protein target. The GLP-1 wedge — catch weight AND strength falling.
  const preservation = buildPreservation(
    (metrics ?? []).map((m) => ({
      recorded_on: m.recorded_on as string,
      weight_kg: m.weight_kg as number | null,
    })),
    (setLogs ?? []).map((l) => ({
      exercise_id: l.exercise_id as string,
      weight_kg: l.weight_kg as number | null,
      reps: l.reps as number | null,
      created_at: l.created_at as string,
    })),
    tz
  );
  const proteinTargetG = latestWeight ? Math.round(latestWeight * 2) : null;

  // Strength progress: per-exercise max weight per session (top 5 most-trained).
  const strengthCharts = buildStrengthProgress(setLogsWithNames);
  // Total volume per week (last 12 weeks).
  const volumeData = buildWeeklyVolume(setLogsWithNames, tz);

  // Water & sleep: last 31 local days, summarised for this week / this month.
  const localDate = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  const todayLocal = localDate(new Date());
  const monthPrefix = todayLocal.slice(0, 7);
  const weekDates = new Set(
    Array.from({ length: 7 }, (_, i) => localDate(new Date(Date.now() - i * 86_400_000)))
  );
  const { data: wellnessRows } = await supabase
    .from("daily_wellness")
    .select("logged_on, water_ml, sleep_hours")
    .eq("user_id", user.id)
    .gte("logged_on", localDate(new Date(Date.now() - 31 * 86_400_000)))
    .order("logged_on", { ascending: false });
  const wellness = (wellnessRows ?? []) as {
    logged_on: string;
    water_ml: number | null;
    sleep_hours: number | null;
  }[];
  const todayWellness = wellness.find((w) => w.logged_on === todayLocal) ?? null;
  const summarise = (rows: typeof wellness): WellnessSummary => {
    const water = rows.filter((r) => (r.water_ml ?? 0) > 0).map((r) => r.water_ml as number);
    const sleep = rows.filter((r) => r.sleep_hours != null).map((r) => Number(r.sleep_hours));
    const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    return { days: rows.length, avgWaterMl: mean(water), avgSleepHours: mean(sleep) };
  };
  const weekSummary = summarise(wellness.filter((w) => weekDates.has(w.logged_on)));
  const monthSummary = summarise(wellness.filter((w) => w.logged_on.startsWith(monthPrefix)));

  return (
    <PageShell>
      <PageHeader
        title="Progress"
        subtitle="Strength, body metrics, attendance and recovery."
        action={
          <Link
            href="/api/export"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-2xl border border-[var(--border-subtle)] px-4 py-2 text-sm font-medium hover:border-[var(--border-active)]"
          >
            <Download className="h-4 w-4" /> Export
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
          label="This week"
          value={String(weeklyCounts.at(-1)?.count ?? 0)}
          sub="sessions"
        />
        <StatCard
          label="This month"
          value={String(countThisMonth(sessions ?? [], tz))}
          sub="sessions"
        />
      </div>

      <div className="mt-6">
        <WeightProgress data={weightData} tz={tz} />
      </div>

      <MusclePreservation
        weightSeries={preservation.weightSeries}
        strengthSeries={preservation.strengthSeries}
        insight={preservation.insight}
        proteinTargetG={proteinTargetG}
      />

      <div className="mt-6">
        <WellnessProgress
          today={todayLocal}
          initialWaterMl={Number(todayWellness?.water_ml ?? 0)}
          initialSleepHours={
            todayWellness?.sleep_hours != null ? Number(todayWellness.sleep_hours) : null
          }
          week={weekSummary}
          month={monthSummary}
        />
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

      {/* Strength Progress — one combined chart, a line per exercise. */}
      <div className="mt-6">
        <h2 className="text-lg font-bold">Strength Progress</h2>
        {strengthCharts.length > 0 ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
              <p className="mb-3 text-sm text-[var(--text-secondary)]">
                Max weight per session · top {strengthCharts.length} exercises
              </p>
              <MultiLineChart
                unit=" kg"
                height={300}
                series={strengthCharts.map((ex, i) => ({
                  name: ex.name,
                  color: `var(--series-${(i % 8) + 1})`,
                  points: ex.data.map((d) => ({
                    t: new Date(d.x).getTime(),
                    y: d.y,
                  })),
                }))}
              />
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
 * per session over time. Returns the top 8 most-trained exercises (by session
 * count) — 8 is the categorical palette's cap, so every line stays
 * distinguishable in the combined chart.
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
    .slice(0, 8)
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

/**
 * Muscle preservation: overlay weekly body weight against a composite weekly
 * strength index (both indexed to 100% at their own first data point, so the
 * curves are comparable regardless of absolute units). Strength is the average
 * of each top-lift's best estimated-1RM that week, each indexed to its own
 * baseline — robust to which lifts you happened to train in a given week.
 */
function buildPreservation(
  weights: { recorded_on: string; weight_kg: number | null }[],
  sets: {
    exercise_id: string;
    weight_kg: number | null;
    reps: number | null;
    created_at: string;
  }[],
  tz: string
): {
  weightSeries: { t: number; y: number }[];
  strengthSeries: { t: number; y: number }[];
  insight: PreservationInsight;
} {
  const WEEKS = 12;
  const thisWeekStart = startOfWeekInTz(new Date(), tz).getTime();
  const weekStarts: number[] = [];
  for (let i = WEEKS - 1; i >= 0; i--)
    weekStarts.push(thisWeekStart - i * 7 * 86_400_000);
  const firstWeek = weekStarts[0];
  const weekOf = (d: Date) => startOfWeekInTz(d, tz).getTime();

  // Weekly average body weight.
  const wAcc = new Map<number, { sum: number; n: number }>();
  for (const m of weights) {
    if (m.weight_kg == null) continue;
    // recorded_on is a plain date; anchor at local noon to avoid tz slippage.
    const wk = weekOf(new Date(`${m.recorded_on}T12:00:00`));
    if (wk < firstWeek) continue;
    const cur = wAcc.get(wk) ?? { sum: 0, n: 0 };
    cur.sum += Number(m.weight_kg);
    cur.n += 1;
    wAcc.set(wk, cur);
  }
  const weightWeekly = weekStarts
    .filter((wk) => wAcc.has(wk))
    .map((wk) => ({ wk, v: wAcc.get(wk)!.sum / wAcc.get(wk)!.n }));

  // Per-exercise best estimated-1RM per week (Epley).
  const byEx = new Map<string, Map<number, number>>();
  const setCount = new Map<string, number>();
  for (const s of sets) {
    const w = s.weight_kg != null ? Number(s.weight_kg) : 0;
    const r = s.reps != null ? Number(s.reps) : 0;
    if (!(w > 0 && r > 0)) continue;
    const wk = weekOf(new Date(s.created_at));
    if (wk < firstWeek) continue;
    const e1rm = w * (1 + r / 30);
    setCount.set(s.exercise_id, (setCount.get(s.exercise_id) ?? 0) + 1);
    const wm = byEx.get(s.exercise_id) ?? new Map<number, number>();
    wm.set(wk, Math.max(wm.get(wk) ?? 0, e1rm));
    byEx.set(s.exercise_id, wm);
  }
  const topEx = Array.from(setCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);

  const sAcc = new Map<number, { sum: number; n: number }>();
  for (const id of topEx) {
    const wm = byEx.get(id);
    if (!wm) continue;
    const orderedWeeks = Array.from(wm.keys()).sort((a, b) => a - b);
    const baseline = wm.get(orderedWeeks[0])!;
    if (!(baseline > 0)) continue;
    for (const wk of orderedWeeks) {
      const idx = (wm.get(wk)! / baseline) * 100;
      const cur = sAcc.get(wk) ?? { sum: 0, n: 0 };
      cur.sum += idx;
      cur.n += 1;
      sAcc.set(wk, cur);
    }
  }
  const strengthWeekly = weekStarts
    .filter((wk) => sAcc.has(wk))
    .map((wk) => ({ wk, v: sAcc.get(wk)!.sum / sAcc.get(wk)!.n }));

  const toIndexed = (rows: { wk: number; v: number }[]) => {
    if (rows.length === 0) return [] as { t: number; y: number }[];
    const base = rows[0].v;
    return rows.map((r) => ({
      t: r.wk,
      y: base > 0 ? Math.round((r.v / base) * 1000) / 10 : 100,
    }));
  };
  const weightSeries = toIndexed(weightWeekly);
  const strengthSeries = toIndexed(strengthWeekly);

  return {
    weightSeries,
    strengthSeries,
    insight: preservationInsight(weightSeries, strengthSeries),
  };
}

function preservationInsight(
  weight: { t: number; y: number }[],
  strength: { t: number; y: number }[]
): PreservationInsight {
  if (weight.length < 2 || strength.length < 2) {
    return {
      tone: "neutral",
      title: "Not enough data yet",
      body: "Keep logging your body weight and workouts for a couple of weeks and we'll tell you whether you're holding muscle.",
    };
  }
  const wChange = weight.at(-1)!.y - 100;
  const sChange = strength.at(-1)!.y - 100;
  const losingWeight = wChange <= -1.5;
  const gainingWeight = wChange >= 1.5;
  const strengthUp = sChange >= 1;
  const strengthDown = sChange <= -3;
  const f = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

  if (losingWeight && !strengthDown) {
    return {
      tone: "good",
      title: "Muscle looks protected 💪",
      body: `Weight is down ${f(wChange)} while strength is ${
        strengthUp ? `up ${f(sChange)}` : "holding steady"
      } — exactly what you want in a weight-loss phase. Keep protein high.`,
    };
  }
  if (losingWeight && strengthDown) {
    return {
      tone: "warn",
      title: "You may be losing muscle",
      body: `Weight is down ${f(wChange)} but so is strength (${f(
        sChange
      )}). Prioritise protein and keep your working weights heavy so the loss comes from fat, not muscle.`,
    };
  }
  if (gainingWeight && strengthUp) {
    return {
      tone: "good",
      title: "Lean gains",
      body: `Weight and strength are both up (${f(wChange)} / ${f(
        sChange
      )}) — you're adding size and getting stronger.`,
    };
  }
  if (gainingWeight && strengthDown) {
    return {
      tone: "warn",
      title: "Weight up, strength down",
      body: `Weight is up ${f(wChange)} but strength dropped ${f(
        sChange
      )}. Check recovery and sleep, and make sure you're progressing your key lifts.`,
    };
  }
  return {
    tone: "neutral",
    title: "Holding steady",
    body: `Weight ${f(wChange)} and strength ${f(
      sChange
    )} vs your baseline. Steady is fine — push a key lift this week to nudge strength up.`,
  };
}
