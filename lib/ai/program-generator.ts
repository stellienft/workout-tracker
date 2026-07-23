/**
 * Turn the training analysis into a tailored split the member can train.
 *
 * Strategy:
 *  - Pick a split shape from how often they actually train (3–5 days).
 *  - For each day, prefer the member's OWN lifts that hit that day's muscles —
 *    the movements they're already progressing on — with progressive-overload
 *    weight targets from their recent bests.
 *  - Fill any gaps (and undertrained muscle groups) from the exercise library.
 *
 * Pure — the caller resolves the returned exercise ids against the library and
 * materialises it as a custom split.
 */

import type { ExerciseMeta, ExerciseProgress, TrainingInsights } from "./analysis";

export interface GeneratedExercise {
  exerciseId: string;
  sets: number;
  repTarget: string;
  restSeconds: number;
  targetWeightKg: number | null;
  note: string;
}

export interface GeneratedDay {
  name: string;
  focusMuscles: string[];
  exercises: GeneratedExercise[];
}

export interface GeneratedProgram {
  name: string;
  description: string;
  daysPerWeek: number;
  days: GeneratedDay[];
}

interface DayShape {
  name: string;
  focus: string[]; // canonical muscle groups this day should cover
}

const SPLIT_SHAPES: Record<number, DayShape[]> = {
  3: [
    { name: "Push", focus: ["chest", "shoulders", "triceps"] },
    { name: "Pull", focus: ["back", "lats", "biceps"] },
    { name: "Legs", focus: ["quads", "hamstrings", "glutes", "calves"] },
  ],
  4: [
    { name: "Upper A", focus: ["chest", "back", "shoulders"] },
    { name: "Lower A", focus: ["quads", "glutes", "calves"] },
    { name: "Upper B", focus: ["back", "lats", "biceps", "triceps"] },
    { name: "Lower B", focus: ["hamstrings", "glutes", "core"] },
  ],
  5: [
    { name: "Push", focus: ["chest", "shoulders", "triceps"] },
    { name: "Pull", focus: ["back", "lats", "biceps"] },
    { name: "Legs", focus: ["quads", "hamstrings", "glutes", "calves"] },
    { name: "Upper", focus: ["chest", "back", "shoulders"] },
    { name: "Lower", focus: ["quads", "hamstrings", "glutes", "core"] },
  ],
};

const ALIASES: Record<string, string> = {
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

function canon(m: string): string {
  const k = m.trim().toLowerCase();
  return ALIASES[k] ?? k;
}

function hitsFocus(muscles: string[], focus: string[]): boolean {
  const set = new Set(muscles.map(canon));
  return focus.some((f) => set.has(f));
}

export function chooseDaysPerWeek(avgPerWeek: number): number {
  const rounded = Math.round(avgPerWeek);
  return Math.min(5, Math.max(3, rounded));
}

const EX_PER_DAY = 5;

/**
 * @param insights   the member's analysed history
 * @param library    every published exercise, with muscle metadata
 * @param opts.daysPerWeek override the auto-picked frequency
 */
export function generateProgram(
  insights: TrainingInsights,
  library: ExerciseMeta[],
  opts: { daysPerWeek?: number } = {}
): GeneratedProgram {
  const daysPerWeek =
    opts.daysPerWeek ?? chooseDaysPerWeek(insights.consistency.avgPerWeek);
  const shape = SPLIT_SHAPES[daysPerWeek] ?? SPLIT_SHAPES[3];

  const progressById = new Map<string, ExerciseProgress>(
    insights.exercises.map((e) => [e.exerciseId, e])
  );
  // The member's staples, best-established first.
  const staples = [...insights.exercises].sort(
    (a, b) => b.sessions - a.sessions
  );
  const libraryById = new Map(library.map((e) => [e.id, e]));

  const used = new Set<string>();

  function targetFor(p: ExerciseProgress | undefined): {
    weight: number | null;
    note: string;
    reps: string;
  } {
    if (!p) {
      return {
        weight: null,
        note: "New addition — work up to a challenging weight.",
        reps: "8-12",
      };
    }
    const wl = p.suggestedWeightKg;
    const w = wl ? `~${wl} kg` : "a challenging weight";
    const map: Record<string, string> = {
      progressing: `On the up — start ${w} and add load when you beat the reps.`,
      building: `Baseline set — ${w}. Keep it honest.`,
      plateaued: `Plateau breaker — ${w} (deloaded), then rebuild.`,
      regressing: `Steady — ${w}. Recover, then push again.`,
    };
    return {
      weight: wl,
      note: map[p.trend] ?? `Target ${w}.`,
      reps: p.usesWeight ? "8-12" : "10-15",
    };
  }

  const days: GeneratedDay[] = shape.map((dayShape) => {
    const chosen: GeneratedExercise[] = [];

    const push = (meta: ExerciseMeta) => {
      if (used.has(meta.id) || chosen.length >= EX_PER_DAY) return;
      used.add(meta.id);
      const p = progressById.get(meta.id);
      const t = targetFor(p);
      chosen.push({
        exerciseId: meta.id,
        sets: 3,
        repTarget: t.reps,
        restSeconds: 90,
        targetWeightKg: t.weight,
        note: t.note,
      });
    };

    // 1. The member's own lifts that hit this day's muscles (their staples).
    for (const p of staples) {
      const meta = libraryById.get(p.exerciseId);
      if (meta && hitsFocus(meta.primaryMuscles, dayShape.focus)) push(meta);
      if (chosen.length >= EX_PER_DAY) break;
    }

    // 2. Fill remaining slots from the library, prioritising this day's focus
    //    order (so undertrained groups near the front get covered first).
    if (chosen.length < EX_PER_DAY) {
      for (const focus of dayShape.focus) {
        for (const meta of library) {
          if (chosen.length >= EX_PER_DAY) break;
          if (hitsFocus(meta.primaryMuscles, [focus])) push(meta);
        }
        if (chosen.length >= EX_PER_DAY) break;
      }
    }

    return {
      name: dayShape.name,
      focusMuscles: dayShape.focus,
      exercises: chosen,
    };
  });

  const plateaued = insights.exercises.filter((e) => e.trend === "plateaued").length;
  const progressing = insights.exercises.filter((e) => e.trend === "progressing").length;

  const description =
    `Built from ${insights.consistency.completedSessions} logged sessions. ` +
    `${daysPerWeek}-day split with weight targets from your recent bests` +
    (plateaued ? `, deloads on ${plateaued} plateaued lift${plateaued === 1 ? "" : "s"}` : "") +
    (progressing ? `, and overload on ${progressing} that's climbing.` : ".");

  return {
    name: "AI Coach — Adaptive Plan",
    description,
    daysPerWeek,
    days,
  };
}
