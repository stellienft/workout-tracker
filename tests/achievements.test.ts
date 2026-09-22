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

function session(daysAgo: number, durationSeconds: number | null = null): AchSession {
  return { startedAt: iso(daysAgo), completedAt: iso(daysAgo), durationSeconds };
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

  it("awards a strength PR tracked by estimated 1RM", () => {
    const sets: AchSet[] = [
      { exerciseId: "bench", weightKg: 60, reps: 8, distanceM: null, durationSeconds: null, completed: true, at: iso(20) },
      { exerciseId: "bench", weightKg: 80, reps: 5, distanceM: null, durationSeconds: null, completed: true, at: iso(3) },
    ];
    const res = computeAchievements([], sets, meta, [], NOW);
    const pr = res.find((a) => a.key === "pr_weight_bench");
    expect(pr).toBeTruthy();
    // Heaviest set is 80×5 → est 1RM = 80 * (1 + 5/30) ≈ 93.
    expect(pr?.value).toBe(93);
    expect(pr?.title).toBe("Heaviest Bench Press");
    expect(pr?.achievedAt).toBe(iso(3));
  });

  it("prefers more reps at the top weight (a better effort) and its date", () => {
    const sets: AchSet[] = [
      { exerciseId: "bench", weightKg: 100, reps: 8, distanceM: null, durationSeconds: null, completed: true, at: iso(12) },
      { exerciseId: "bench", weightKg: 100, reps: 10, distanceM: null, durationSeconds: null, completed: true, at: iso(1) },
    ];
    const res = computeAchievements([], sets, meta, [], NOW);
    const pr = res.find((a) => a.key === "pr_weight_bench");
    // 100×10 (est 1RM ≈ 133) beats 100×8 and carries the more recent date.
    expect(pr?.value).toBe(133);
    expect(pr?.description).toContain("100 kg × 10");
    expect(pr?.achievedAt).toBe(iso(1));
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

  it("shows the actual body change, keyed to the milestone tier reached", () => {
    // 139 → 131 is an 8 kg loss: clears the 5 kg tier but shows the real 8 kg.
    const body: BodyPoint[] = [
      { date: iso(60), weightKg: 139 },
      { date: iso(1), weightKg: 131 },
    ];
    const res = computeAchievements([], [], meta, body, NOW);
    const badge = res.find((a) => a.key === "body_loss_5");
    expect(badge).toBeTruthy();
    expect(badge?.title).toBe("Lost 8 kg");
    expect(res.find((a) => a.key === "body_loss_10")).toBeFalsy();
    // Only the top tier shows — not a stack of lower ones.
    expect(res.find((a) => a.key === "body_loss_2.5")).toBeFalsy();
  });

  it("awards a cardio distance best", () => {
    const sets: AchSet[] = [
      { exerciseId: "bench", weightKg: null, reps: null, distanceM: 12000, durationSeconds: 3600, completed: true, at: iso(4) },
    ];
    const res = computeAchievements([], sets, meta, [], NOW);
    expect(res.find((a) => a.key === "cardio_distance")?.value).toBe(12000);
  });

  it("awards the longest session from the session's tracked time, not a set", () => {
    const sessions: AchSession[] = [session(3, 1800), session(1, 4800)];
    // A short timed set must not masquerade as the longest session.
    const sets: AchSet[] = [
      { exerciseId: "bench", weightKg: null, reps: null, distanceM: null, durationSeconds: 180, completed: true, at: iso(1) },
    ];
    const res = computeAchievements(sessions, sets, meta, [], NOW);
    const longest = res.find((a) => a.key === "session_duration");
    expect(longest?.value).toBe(4800); // 80 minutes
    expect(longest?.description).toContain("80 minutes");
    expect(res.find((a) => a.key === "cardio_duration")).toBeFalsy();
  });

  it("ignores a forgotten-timer session (over 3 hours) for longest session", () => {
    const sessions: AchSession[] = [session(3, 4800), session(1, 4 * 60 * 60)];
    const res = computeAchievements(sessions, [], meta, [], NOW);
    // The 4-hour session is treated as a forgotten timer and skipped.
    expect(res.find((a) => a.key === "session_duration")?.value).toBe(4800);
  });

  it("falls back to wall-clock time when a session has no tracked duration", () => {
    const sessions: AchSession[] = [
      { startedAt: iso(2), completedAt: new Date(NOW - 2 * DAY + 3000 * 1000).toISOString(), durationSeconds: null },
    ];
    const res = computeAchievements(sessions, [], meta, [], NOW);
    expect(res.find((a) => a.key === "session_duration")?.value).toBe(3000);
  });
});
