import { describe, it, expect } from "vitest";
import {
  estimate1RM,
  roundLoad,
  analyzeConsistency,
  analyzeExercise,
  analyzeMuscleBalance,
  buildInsights,
  type AnalysisSet,
  type ExerciseMeta,
} from "@/lib/ai/analysis";
import {
  chooseDaysPerWeek,
  generateProgram,
} from "@/lib/ai/program-generator";

const DAY = 86400000;
const NOW = new Date("2026-07-23T12:00:00Z").getTime();

function daysAgo(n: number, h = 12): string {
  return new Date(NOW - n * DAY + h * 3600000 - 12 * 3600000).toISOString();
}

describe("estimate1RM", () => {
  it("returns the weight for a single", () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });
  it("applies Epley for multiple reps", () => {
    expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 1);
  });
  it("is zero for invalid input", () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(50, 0)).toBe(0);
  });
});

describe("roundLoad", () => {
  it("rounds to the nearest 2.5 kg", () => {
    expect(roundLoad(61)).toBe(60);
    expect(roundLoad(64)).toBe(65);
    expect(roundLoad(63.7)).toBe(62.5);
    expect(roundLoad(-5)).toBe(0);
  });
});

describe("analyzeConsistency", () => {
  it("is not eligible with sparse training", () => {
    const dates = [daysAgo(2), daysAgo(20)];
    const c = analyzeConsistency(dates, NOW);
    expect(c.eligible).toBe(false);
    expect(c.progress).toBeLessThan(1);
  });

  it("is eligible after 4 weeks of ~3x/week", () => {
    const dates: string[] = [];
    for (let week = 0; week < 5; week++) {
      for (const d of [0, 2, 4]) dates.push(daysAgo(week * 7 + d));
    }
    const c = analyzeConsistency(dates, NOW);
    expect(c.eligible).toBe(true);
    expect(c.progress).toBe(1);
    expect(c.sessionsLast4Weeks).toBeGreaterThanOrEqual(8);
    expect(c.weeksWithSessions).toBe(4);
  });

  it("needs the full 4-week span even with many recent sessions", () => {
    // 10 sessions but all inside the last 10 days.
    const dates = Array.from({ length: 10 }, (_, i) => daysAgo(i));
    const c = analyzeConsistency(dates, NOW);
    expect(c.eligible).toBe(false); // span < 28 days
  });
});

describe("analyzeExercise", () => {
  const meta: ExerciseMeta = {
    id: "ex1",
    name: "Bench Press",
    primaryMuscles: ["chest"],
    category: "strength",
  };

  it("flags a climbing lift as progressing", () => {
    const sets: AnalysisSet[] = [
      { exerciseId: "ex1", weightKg: 60, reps: 8, rpe: null, completed: true, at: daysAgo(28) },
      { exerciseId: "ex1", weightKg: 65, reps: 8, rpe: null, completed: true, at: daysAgo(21) },
      { exerciseId: "ex1", weightKg: 70, reps: 8, rpe: null, completed: true, at: daysAgo(7) },
      { exerciseId: "ex1", weightKg: 75, reps: 8, rpe: null, completed: true, at: daysAgo(1) },
    ];
    const r = analyzeExercise(meta, sets);
    expect(r.trend).toBe("progressing");
    expect(r.percentChange).toBeGreaterThan(0);
    expect(r.suggestedWeightKg).toBeGreaterThan(0);
  });

  it("flags a flat lift as plateaued", () => {
    const sets: AnalysisSet[] = [0, 7, 14, 21].map((d) => ({
      exerciseId: "ex1",
      weightKg: 80,
      reps: 5,
      rpe: null,
      completed: true,
      at: daysAgo(d),
    }));
    const r = analyzeExercise(meta, sets);
    expect(r.trend).toBe("plateaued");
    // plateau prescription deloads below the working weight
    expect(r.suggestedWeightKg).toBeLessThan(80);
  });

  it("treats too-few sessions as building", () => {
    const sets: AnalysisSet[] = [
      { exerciseId: "ex1", weightKg: 60, reps: 8, rpe: null, completed: true, at: daysAgo(3) },
      { exerciseId: "ex1", weightKg: 62.5, reps: 8, rpe: null, completed: true, at: daysAgo(1) },
    ];
    expect(analyzeExercise(meta, sets).trend).toBe("building");
  });
});

describe("analyzeMuscleBalance", () => {
  it("flags untrained core groups as undertrained", () => {
    const meta = new Map<string, ExerciseMeta>([
      ["ex1", { id: "ex1", name: "Bench", primaryMuscles: ["chest"], category: "s" }],
    ]);
    const sets: AnalysisSet[] = Array.from({ length: 12 }, (_, i) => ({
      exerciseId: "ex1",
      weightKg: 60,
      reps: 8,
      rpe: null,
      completed: true,
      at: daysAgo(i),
    }));
    const b = analyzeMuscleBalance(sets, meta, 28, NOW);
    expect(b.perMuscle.find((m) => m.muscle === "chest")?.sets).toBe(12);
    expect(b.undertrained).toContain("back");
    expect(b.undertrained).not.toContain("chest");
  });
});

describe("program generation", () => {
  it("picks a sensible weekly frequency", () => {
    expect(chooseDaysPerWeek(2.2)).toBe(3);
    expect(chooseDaysPerWeek(4)).toBe(4);
    expect(chooseDaysPerWeek(9)).toBe(5);
  });

  it("builds a split from insights using the member's own lifts", () => {
    const meta = new Map<string, ExerciseMeta>([
      ["bench", { id: "bench", name: "Bench Press", primaryMuscles: ["chest"], category: "s" }],
      ["row", { id: "row", name: "Barbell Row", primaryMuscles: ["back"], category: "s" }],
      ["squat", { id: "squat", name: "Back Squat", primaryMuscles: ["quads"], category: "s" }],
    ]);
    const sessionDates: string[] = [];
    for (let week = 0; week < 5; week++) for (const d of [0, 2, 4]) sessionDates.push(daysAgo(week * 7 + d));
    const sets: AnalysisSet[] = [];
    for (const id of meta.keys()) {
      [28, 21, 14, 7, 1].forEach((d, i) =>
        sets.push({
          exerciseId: id,
          weightKg: 60 + i * 5,
          reps: 8,
          rpe: null,
          completed: true,
          at: daysAgo(d),
        })
      );
    }
    const insights = buildInsights(sessionDates, sets, meta, NOW);
    expect(insights.consistency.eligible).toBe(true);

    const library: ExerciseMeta[] = Array.from(meta.values());
    const program = generateProgram(insights, library, { daysPerWeek: 3 });
    expect(program.days).toHaveLength(3);
    // Bench should land on the Push day with a weight target from its history.
    const push = program.days.find((d) => d.name === "Push");
    const benchOnPush = push?.exercises.find((e) => e.exerciseId === "bench");
    expect(benchOnPush).toBeTruthy();
    expect(benchOnPush?.targetWeightKg).toBeGreaterThan(0);
    // An exercise is never scheduled on two days.
    const allIds = program.days.flatMap((d) => d.exercises.map((e) => e.exerciseId));
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
