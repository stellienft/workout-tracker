/**
 * Achievements / milestones engine — pure, unit-testable.
 *
 * Derives motivational badges from the member's logged history: attendance
 * streaks, workout-count milestones, strength & rep personal records, lifetime
 * volume, body-composition change and cardio bests. The server action persists
 * "earned" dates and detects newly-earned badges to celebrate.
 */

import { estimate1RM, roundLoad } from "@/lib/ai/analysis";

const DAY = 86_400_000;

export type AchGroup =
  | "Streaks"
  | "Attendance"
  | "Personal records"
  | "Milestones"
  | "Body"
  | "Cardio";

export type AchIcon =
  | "flame"
  | "medal"
  | "dumbbell"
  | "repeat"
  | "layers"
  | "scale"
  | "footprints"
  | "timer"
  | "trophy";

export interface Achievement {
  key: string; // stable id per user (PRs key by exercise and level up)
  group: AchGroup;
  icon: AchIcon;
  title: string;
  description: string;
  value: number | null; // used to detect a PR "level up"
  achievedAt: string; // ISO date the milestone was reached (best-effort)
}

export interface AchSession {
  startedAt: string;
  completedAt: string | null;
}

export interface AchSet {
  exerciseId: string;
  weightKg: number | null;
  reps: number | null;
  distanceM: number | null;
  durationSeconds: number | null;
  completed: boolean;
  at: string;
}

export interface AchExerciseMeta {
  id: string;
  name: string;
}

export interface BodyPoint {
  date: string; // ISO
  weightKg: number;
}

function startOfDay(iso: string): number {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const WORKOUT_MILESTONES = [1, 5, 10, 25, 50, 100, 200, 365];
const STREAK_MILESTONES = [2, 4, 8, 12, 26, 52];
const VOLUME_MILESTONES = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];
const BODY_MILESTONES = [2.5, 5, 10, 15, 20];

/** Longest run of consecutive weeks with at least one session. */
export function longestWeeklyStreak(sessionDates: string[]): number {
  if (sessionDates.length === 0) return 0;
  const weeks = new Set(sessionDates.map((d) => Math.floor(startOfDay(d) / (7 * DAY))));
  let best = 0;
  for (const w of weeks) {
    // Only count a run from its start (previous week absent) to avoid re-counting.
    if (weeks.has(w - 1)) continue;
    let len = 1;
    while (weeks.has(w + len)) len++;
    best = Math.max(best, len);
  }
  return best;
}

export function computeAchievements(
  sessions: AchSession[],
  sets: AchSet[],
  metaById: Map<string, AchExerciseMeta>,
  body: BodyPoint[],
  now: number = Date.now()
): Achievement[] {
  const out: Achievement[] = [];

  // ---- Attendance (workout count) ----
  const completed = sessions
    .filter((s) => s.completedAt)
    .map((s) => s.completedAt as string)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const total = completed.length;
  for (const m of WORKOUT_MILESTONES) {
    if (total >= m) {
      out.push({
        key: `workouts_${m}`,
        group: "Attendance",
        icon: "medal",
        title: m === 1 ? "First workout!" : `${m} workouts`,
        description:
          m === 1
            ? "You logged your very first session."
            : `You've completed ${m} workouts. Consistency pays off.`,
        value: m,
        achievedAt: completed[m - 1],
      });
    }
  }

  // ---- Attendance streak (consecutive weeks) ----
  const streak = longestWeeklyStreak(completed);
  const lastSession = completed.at(-1) ?? new Date(now).toISOString();
  for (const m of STREAK_MILESTONES) {
    if (streak >= m) {
      out.push({
        key: `streak_${m}w`,
        group: "Streaks",
        icon: "flame",
        title: `${m}-week streak`,
        description: `You trained ${m} weeks in a row. On fire!`,
        value: m,
        achievedAt: lastSession,
      });
    }
  }

  // ---- Strength & rep PRs (per exercise) ----
  const bestWeight = new Map<string, { w: number; reps: number; at: string }>();
  const bestReps = new Map<string, { reps: number; at: string }>();
  const sessionsByExercise = new Map<string, Set<number>>();
  let totalVolume = 0;
  let bestDistance: { m: number; at: string } | null = null;
  let bestDuration: { s: number; at: string } | null = null;

  for (const s of sets) {
    if (!s.completed) continue;
    const w = s.weightKg ?? 0;
    const r = s.reps ?? 0;
    if (w > 0 && r > 0) totalVolume += w * r;

    const days = sessionsByExercise.get(s.exerciseId) ?? new Set<number>();
    days.add(startOfDay(s.at));
    sessionsByExercise.set(s.exerciseId, days);

    if (w > 0 && r > 0) {
      const cur = bestWeight.get(s.exerciseId);
      if (!cur || w > cur.w) bestWeight.set(s.exerciseId, { w, reps: r, at: s.at });
    }
    if (r > 0 && w === 0) {
      const cur = bestReps.get(s.exerciseId);
      if (!cur || r > cur.reps) bestReps.set(s.exerciseId, { reps: r, at: s.at });
    }
    if ((s.distanceM ?? 0) > 0) {
      if (!bestDistance || (s.distanceM as number) > bestDistance.m)
        bestDistance = { m: s.distanceM as number, at: s.at };
    }
    if ((s.durationSeconds ?? 0) > 0) {
      if (!bestDuration || (s.durationSeconds as number) > bestDuration.s)
        bestDuration = { s: s.durationSeconds as number, at: s.at };
    }
  }

  const hasEnough = (exId: string) => (sessionsByExercise.get(exId)?.size ?? 0) >= 2;

  for (const [exId, best] of bestWeight) {
    if (!hasEnough(exId)) continue;
    const meta = metaById.get(exId);
    if (!meta) continue;
    const e1rm = Math.round(estimate1RM(best.w, best.reps));
    out.push({
      key: `pr_weight_${exId}`,
      group: "Personal records",
      icon: "dumbbell",
      title: `Heaviest ${meta.name}`,
      description: `Lifted ${roundLoad(best.w)} kg × ${best.reps} (est. 1RM ${e1rm} kg).`,
      value: best.w,
      achievedAt: best.at,
    });
  }

  for (const [exId, best] of bestReps) {
    if (!hasEnough(exId)) continue;
    const meta = metaById.get(exId);
    if (!meta) continue;
    out.push({
      key: `pr_reps_${exId}`,
      group: "Personal records",
      icon: "repeat",
      title: `Most ${meta.name} reps`,
      description: `${best.reps} reps in a set — a new best.`,
      value: best.reps,
      achievedAt: best.at,
    });
  }

  // ---- Lifetime volume ----
  for (const m of VOLUME_MILESTONES) {
    if (totalVolume >= m) {
      out.push({
        key: `volume_${m}`,
        group: "Milestones",
        icon: "layers",
        title: `${m.toLocaleString()} kg moved`,
        description: `Total weight lifted across every set has passed ${m.toLocaleString()} kg.`,
        value: m,
        achievedAt: lastSession,
      });
    }
  }

  // ---- Body composition change ----
  if (body.length >= 2) {
    const sorted = [...body].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const start = sorted[0];
    const latest = sorted[sorted.length - 1];
    const change = latest.weightKg - start.weightKg;
    const gained = change >= 0;
    for (const m of BODY_MILESTONES) {
      if (Math.abs(change) >= m) {
        out.push({
          key: `body_${gained ? "gain" : "loss"}_${m}`,
          group: "Body",
          icon: "scale",
          title: gained ? `Gained ${m} kg` : `Lost ${m} kg`,
          description: gained
            ? `You've put on ${m} kg since you started tracking.`
            : `You've dropped ${m} kg since you started tracking.`,
          value: m,
          achievedAt: latest.date,
        });
      }
    }
  }

  // ---- Cardio bests ----
  if (bestDistance) {
    out.push({
      key: "cardio_distance",
      group: "Cardio",
      icon: "footprints",
      title: "Longest distance",
      description: `You covered ${(bestDistance.m / 1000).toFixed(2)} km in a single effort.`,
      value: bestDistance.m,
      achievedAt: bestDistance.at,
    });
  }
  if (bestDuration) {
    const mins = Math.round(bestDuration.s / 60);
    out.push({
      key: "cardio_duration",
      group: "Cardio",
      icon: "timer",
      title: "Longest session",
      description: `You kept going for ${mins} minute${mins === 1 ? "" : "s"} straight.`,
      value: bestDuration.s,
      achievedAt: bestDuration.at,
    });
  }

  // Newest first within the final list.
  out.sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime());
  return out;
}
