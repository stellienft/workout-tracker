import { describe, it, expect } from "vitest";
import {
  longestWeeklyStreak,
  computeAchievements,
  type AchSession,
  type AchSet,
  type AchExerciseMeta,
  type BodyPoint,
} from "@/lib/achievements";

const DAY = 86_400_000;
const NOW = new Date("2026-07-24T12:00:00Z").getTime();
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

function session(daysAgo: number): AchSession {
  return { startedAt: iso(daysAgo), completedAt: iso(daysAgo) };
}

describe("longestWeeklyStreak", () => {
  it("counts consecutive weeks", () => {
    // one session in each of 4 consecutive weeks
    const dates = [iso(2), iso(9), iso(16), iso(23)];
    expect(longestWeeklyStreak(dates)).toBe(4);
  });
  it("resets on a gap", () => {
    const dates = [iso(2), iso(9), iso(30), iso(37)];
    expect(longestWeeklyStreak(dates)).toBe(2);
  });
  it("is zero with no sessions", () => {
    expect(longestWeeklyStreak([])).toBe(0);
  });
});

describe("computeAchievements", () => {
  const meta = new Map<string, AchExerciseMeta>([
    ["bench", { id: "bench", name: "Bench Press" }],
    ["situp", { id: "situp", name: "Sit Up" }],
  ]);

  it("awards workout-count and streak milestones", () => {
    const sessions: AchSession[] = [];
    for (let w = 0; w < 5; w++) for (const d of [0, 2, 4]) sessions.push(session(w * 7 + d));
    const res = computeAchievements(sessions, [], meta, [], NOW);
    const keys = res.map((a) => a.key);
    expect(keys).toContain("workouts_10"); // 15 sessions
    expect(keys).toContain("streak_4w"); // 5 weeks in a row
    expect(keys).not.toContain("workouts_25");
  });

  it("awards a strength PR that levels up with the heaviest set", () => {
    const sets: AchSet[] = [
      { exerciseId: "bench", weightKg: 60, reps: 8, distanceM: null, durationSeconds: null, completed: true, at: iso(20) },
      { exerciseId: "bench", weightKg: 80, reps: 5, distanceM: null, durationSeconds: null, completed: true, at: iso(3) },
    ];
    const res = computeAchievements([], sets, meta, [], NOW);
    const pr = res.find((a) => a.key === "pr_weight_bench");
    expect(pr).toBeTruthy();
    expect(pr?.value).toBe(80); // tracks the heaviest
    expect(pr?.title).toBe("Heaviest Bench Press");
  });

  it("needs 2+ sessions before a PR badge is awarded", () => {
    const sets: AchSet[] = [
      { exerciseId: "bench", weightKg: 100, reps: 3, distanceM: null, durationSeconds: null, completed: true, at: iso(1) },
    ];
    const res = computeAchievements([], sets, meta, [], NOW);
    expect(res.find((a) => a.key === "pr_weight_bench")).toBeFalsy();
  });

  it("awards a rep PR for bodyweight movements", () => {
    const sets: AchSet[] = [
      { exerciseId: "situp", weightKg: null, reps: 20, distanceM: null, durationSeconds: null, completed: true, at: iso(10) },
      { exerciseId: "situp", weightKg: null, reps: 30, distanceM: null, durationSeconds: null, completed: true, at: iso(2) },
    ];
    const res = computeAchievements([], sets, meta, [], NOW);
    const pr = res.find((a) => a.key === "pr_reps_situp");
    expect(pr?.value).toBe(30);
  });

  it("awards a body-composition change", () => {
    const body: BodyPoint[] = [
      { date: iso(60), weightKg: 80 },
      { date: iso(1), weightKg: 85.5 },
    ];
    const res = computeAchievements([], [], meta, body, NOW);
    const keys = res.map((a) => a.key);
    expect(keys).toContain("body_gain_5");
    expect(keys).not.toContain("body_gain_10");
  });

  it("awards cardio bests", () => {
    const sets: AchSet[] = [
      { exerciseId: "bench", weightKg: null, reps: null, distanceM: 12000, durationSeconds: 3600, completed: true, at: iso(4) },
    ];
    const res = computeAchievements([], sets, meta, [], NOW);
    expect(res.find((a) => a.key === "cardio_distance")?.value).toBe(12000);
    expect(res.find((a) => a.key === "cardio_duration")?.value).toBe(3600);
  });
});
