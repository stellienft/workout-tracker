/**
 * Adaptive-coaching analysis engine.
 *
 * Pure functions — no IO — so they're fully unit-testable. The server action in
 * lib/actions/ai-coach.ts feeds these with the member's logged sessions and set
 * data and turns the result into insights + a tailored program.
 *
 * "Intelligence" here means: estimate strength from logged sets, detect whether
 * each lift is progressing / plateaued / regressing, measure training
 * consistency and muscle-group balance, and prescribe the next move. It
 * activates only after 4 weeks of consistent training.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- Inputs ----------

export interface AnalysisSet {
  exerciseId: string;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
  at: string; // ISO datetime of the set/session
}

export interface ExerciseMeta {
  id: string;
  name: string;
  primaryMuscles: string[];
  category: string;
}

// ---------- Outputs ----------

export type Trend = "progressing" | "plateaued" | "regressing" | "building";

export interface Consistency {
  completedSessions: number;
  sessionsLast4Weeks: number;
  weeksWithSessions: number; // of the last 4
  spanDays: number; // first logged session → now
  avgPerWeek: number;
  eligible: boolean;
  progress: number; // 0..1 toward unlocking
  sessionsNeeded: number; // more sessions to hit the threshold
}

export interface ExerciseProgress {
  exerciseId: string;
  name: string;
  primaryMuscles: string[];
  sessions: number;
  trend: Trend;
  usesWeight: boolean;
  bestWeightKg: number | null;
  bestEst1RM: number | null;
  firstEst1RM: number | null;
  lastEst1RM: number | null;
  percentChange: number | null; // over the tracked window
  bestReps: number | null;
  recommendation: string;
  suggestedWeightKg: number | null; // next working weight for a hypertrophy set
}

export interface MuscleBalance {
  perMuscle: { muscle: string; sets: number; share: number }[];
  undertrained: string[];
  overtrained: string[];
}

export interface TrainingInsights {
  consistency: Consistency;
  exercises: ExerciseProgress[];
  balance: MuscleBalance;
  generatedAt: string;
}

// ---------- Core maths ----------

/** Epley estimated one-rep max. Falls back to the raw weight for a single. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Round to the nearest loadable 2.5 kg. */
export function roundLoad(kg: number): number {
  return Math.max(0, Math.round(kg / 2.5) * 2.5);
}

function startOfDay(iso: string): number {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ---------- Consistency ----------

/**
 * Judge whether the member has trained consistently for 4 weeks. `sessionDates`
 * are ISO datetimes of *completed* sessions. Eligible = training span ≥ 28 days,
 * ≥ 3 of the last 4 weeks trained, and ≥ 8 sessions in the last 4 weeks.
 */
export function analyzeConsistency(
  sessionDates: string[],
  now: number = Date.now()
): Consistency {
  const days = Array.from(new Set(sessionDates.map(startOfDay))).sort((a, b) => a - b);
  const completedSessions = sessionDates.length;

  if (days.length === 0) {
    return {
      completedSessions: 0,
      sessionsLast4Weeks: 0,
      weeksWithSessions: 0,
      spanDays: 0,
      avgPerWeek: 0,
      eligible: false,
      progress: 0,
      sessionsNeeded: 8,
    };
  }

  const spanDays = Math.floor((now - days[0]) / DAY_MS);
  const fourWeeksAgo = now - 28 * DAY_MS;

  const last4 = sessionDates.filter((d) => new Date(d).getTime() >= fourWeeksAgo);
  const sessionsLast4Weeks = last4.length;

  // How many of the last 4 seven-day buckets contain a session.
  const buckets = new Set<number>();
  for (const d of last4) {
    const ageDays = (now - new Date(d).getTime()) / DAY_MS;
    buckets.add(Math.min(3, Math.floor(ageDays / 7)));
  }
  const weeksWithSessions = buckets.size;

  const avgPerWeek = spanDays > 0 ? completedSessions / (spanDays / 7) : completedSessions;

  const eligible =
    spanDays >= 28 && weeksWithSessions >= 3 && sessionsLast4Weeks >= 8;

  // Progress blends elapsed time (half) and volume of sessions (half).
  const timeProgress = Math.min(1, spanDays / 28);
  const volumeProgress = Math.min(1, sessionsLast4Weeks / 8);
  const progress = eligible ? 1 : Math.min(0.99, timeProgress * 0.5 + volumeProgress * 0.5);

  return {
    completedSessions,
    sessionsLast4Weeks,
    weeksWithSessions,
    spanDays,
    avgPerWeek: Math.round(avgPerWeek * 10) / 10,
    eligible,
    progress: Math.round(progress * 100) / 100,
    sessionsNeeded: Math.max(0, 8 - sessionsLast4Weeks),
  };
}

// ---------- Per-exercise progression ----------

/** Best (weight, reps, e1RM) achieved on each distinct training day, ordered. */
function bestPerDay(sets: AnalysisSet[]) {
  const byDay = new Map<
    number,
    { weight: number | null; reps: number | null; e1rm: number }
  >();
  for (const s of sets) {
    if (!s.completed) continue;
    const day = startOfDay(s.at);
    const w = s.weightKg ?? null;
    const r = s.reps ?? null;
    const e1rm = w && r ? estimate1RM(w, r) : 0;
    const cur = byDay.get(day);
    if (!cur || e1rm > cur.e1rm || (e1rm === 0 && (r ?? 0) > (cur.reps ?? 0))) {
      byDay.set(day, { weight: w, reps: r, e1rm });
    }
  }
  return Array.from(byDay.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);
}

export function analyzeExercise(
  meta: ExerciseMeta,
  sets: AnalysisSet[]
): ExerciseProgress {
  const series = bestPerDay(sets);
  const usesWeight = sets.some((s) => (s.weightKg ?? 0) > 0);
  const sessions = series.length;

  const bestWeightKg = usesWeight
    ? Math.max(0, ...sets.map((s) => s.weightKg ?? 0)) || null
    : null;
  const bestReps = Math.max(0, ...sets.map((s) => s.reps ?? 0)) || null;

  const e1rms = series.map((s) => s.e1rm).filter((n) => n > 0);
  const bestEst1RM = e1rms.length ? Math.max(...e1rms) : null;
  const firstEst1RM = e1rms.length ? e1rms[0] : null;
  const lastEst1RM = e1rms.length ? e1rms[e1rms.length - 1] : null;

  // Compare the recent window to the earlier window. For weighted lifts we use
  // estimated 1RM; for bodyweight/timed work we fall back to reps.
  const metric = usesWeight
    ? series.map((s) => s.e1rm)
    : series.map((s) => s.reps ?? 0);
  const recentCount = Math.min(3, Math.max(1, Math.floor(metric.length / 2)));
  const recent = metric.slice(-recentCount);
  const prior = metric.slice(0, -recentCount);
  const recentBest = recent.length ? Math.max(...recent) : 0;
  const priorBest = prior.length ? Math.max(...prior) : 0;

  let trend: Trend;
  if (sessions < 3 || priorBest === 0) trend = "building";
  else if (recentBest > priorBest * 1.02) trend = "progressing";
  else if (recentBest < priorBest * 0.97) trend = "regressing";
  else trend = "plateaued";

  const percentChange =
    firstEst1RM && lastEst1RM ? (lastEst1RM - firstEst1RM) / firstEst1RM : null;

  // Prescribe the next move + a working weight for an ~8-rep hypertrophy set.
  let recommendation: string;
  let suggestedWeightKg: number | null = null;
  const workingFrom = (e1rm: number) => roundLoad(e1rm / (1 + 8 / 30));

  if (trend === "building") {
    recommendation = "Keep logging — a few more sessions sets your baseline.";
    if (bestEst1RM) suggestedWeightKg = workingFrom(bestEst1RM);
  } else if (trend === "progressing") {
    recommendation = usesWeight
      ? "Progressing well — add 2.5 kg or one rep next session."
      : "Progressing well — add reps or slow the tempo.";
    if (bestEst1RM) suggestedWeightKg = roundLoad(workingFrom(bestEst1RM) + 2.5);
  } else if (trend === "plateaued") {
    recommendation = usesWeight
      ? "Plateaued — deload ~10% and rebuild, or swap in a variation."
      : "Plateaued — change the variation or add a set.";
    if (bestEst1RM) suggestedWeightKg = roundLoad(workingFrom(bestEst1RM) * 0.9);
  } else {
    recommendation = "Dropped off lately — hold the weight and prioritise recovery.";
    if (bestEst1RM) suggestedWeightKg = workingFrom(bestEst1RM);
  }

  return {
    exerciseId: meta.id,
    name: meta.name,
    primaryMuscles: meta.primaryMuscles,
    sessions,
    trend,
    usesWeight,
    bestWeightKg,
    bestEst1RM: bestEst1RM ? Math.round(bestEst1RM * 10) / 10 : null,
    firstEst1RM: firstEst1RM ? Math.round(firstEst1RM * 10) / 10 : null,
    lastEst1RM: lastEst1RM ? Math.round(lastEst1RM * 10) / 10 : null,
    percentChange: percentChange !== null ? Math.round(percentChange * 1000) / 1000 : null,
    bestReps,
    recommendation,
    suggestedWeightKg,
  };
}

// ---------- Muscle-group balance ----------

// Canonical groups we care about balancing.
const CORE_GROUPS = [
  "chest",
  "back",
  "lats",
  "shoulders",
  "quads",
  "hamstrings",
  "glutes",
  "biceps",
  "triceps",
  "core",
  "calves",
];

const GROUP_ALIASES: Record<string, string> = {
  pectorals: "chest",
  "upper back": "back",
  "lower back": "back",
  traps: "back",
  delts: "shoulders",
  deltoids: "shoulders",
  quadriceps: "quads",
  hamstring: "hamstrings",
  glute: "glutes",
  gluteus: "glutes",
  abs: "core",
  abdominals: "core",
  obliques: "core",
  bicep: "biceps",
  tricep: "triceps",
  calf: "calves",
};

function canonMuscle(m: string): string {
  const k = m.trim().toLowerCase();
  return GROUP_ALIASES[k] ?? k;
}

/** Count working sets per muscle group over the window and flag imbalances. */
export function analyzeMuscleBalance(
  sets: AnalysisSet[],
  metaById: Map<string, ExerciseMeta>,
  windowDays = 28,
  now: number = Date.now()
): MuscleBalance {
  const since = now - windowDays * DAY_MS;
  const counts = new Map<string, number>();
  for (const s of sets) {
    if (!s.completed) continue;
    if (new Date(s.at).getTime() < since) continue;
    const meta = metaById.get(s.exerciseId);
    if (!meta) continue;
    for (const raw of meta.primaryMuscles) {
      const g = canonMuscle(raw);
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
  }

  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const trackedGroups = Array.from(new Set([...CORE_GROUPS, ...counts.keys()]));
  const perMuscle = trackedGroups
    .map((muscle) => {
      const s = counts.get(muscle) ?? 0;
      return { muscle, sets: s, share: total ? s / total : 0 };
    })
    .sort((a, b) => b.sets - a.sets);

  const avg = total / Math.max(1, CORE_GROUPS.length);
  const undertrained = CORE_GROUPS.filter((g) => (counts.get(g) ?? 0) < avg * 0.5);
  const overtrained = perMuscle
    .filter((p) => p.sets > avg * 2 && p.sets > 0)
    .map((p) => p.muscle);

  return { perMuscle, undertrained, overtrained };
}

// ---------- Assemble ----------

export function buildInsights(
  sessionDates: string[],
  sets: AnalysisSet[],
  metaById: Map<string, ExerciseMeta>,
  now: number = Date.now()
): TrainingInsights {
  const byExercise = new Map<string, AnalysisSet[]>();
  for (const s of sets) {
    const arr = byExercise.get(s.exerciseId) ?? [];
    arr.push(s);
    byExercise.set(s.exerciseId, arr);
  }

  const exercises: ExerciseProgress[] = [];
  for (const [exerciseId, exSets] of byExercise) {
    const meta = metaById.get(exerciseId);
    if (!meta) continue;
    exercises.push(analyzeExercise(meta, exSets));
  }

  // Most-trained first, then by strength gained.
  exercises.sort((a, b) => b.sessions - a.sessions || (b.percentChange ?? 0) - (a.percentChange ?? 0));

  return {
    consistency: analyzeConsistency(sessionDates, now),
    exercises,
    balance: analyzeMuscleBalance(sets, metaById, 28, now),
    generatedAt: new Date(now).toISOString(),
  };
}
