import { describe, it, expect } from "vitest";
import {
  sequentialRotation,
  nextSequentialWorkout,
  nextWeeklySplitWorkout,
  nextCalendarWorkout,
  completedThisWeek,
  advanceAfterCompletion,
  weeklyTargetFor,
  weeklyProgress,
  type EngineTemplate,
  type EngineEnrolment,
  type EngineSession,
} from "@/lib/engine";

// Beginner-style sequential program: A, B required + optional recovery C.
const seqTemplates: EngineTemplate[] = [
  { id: "A", name: "Full Body A", sequence_order: 1, week_position: null, day_of_week: null, is_optional: false },
  { id: "B", name: "Full Body B", sequence_order: 2, week_position: null, day_of_week: null, is_optional: false },
  { id: "C", name: "Recovery C", sequence_order: null, week_position: null, day_of_week: null, is_optional: true },
];

const baseEnrolment: EngineEnrolment = {
  current_week: 1,
  next_workout_sequence: 1,
  selected_days_per_week: 3,
  start_date: "2026-07-13",
};

describe("sequential scheduling", () => {
  it("excludes optional workouts from the rotation", () => {
    const rot = sequentialRotation(seqTemplates);
    expect(rot.map((t) => t.id)).toEqual(["A", "B"]);
  });

  it("starts at workout A", () => {
    const next = nextSequentialWorkout(seqTemplates, { next_workout_sequence: 1 });
    expect(next?.id).toBe("A");
  });

  it("advances to B after completing A", () => {
    const state = advanceAfterCompletion(
      "sequential",
      seqTemplates,
      baseEnrolment,
      "A",
      1,
      12
    );
    expect(state.next_workout_sequence).toBe(2);
    const next = nextSequentialWorkout(seqTemplates, {
      next_workout_sequence: state.next_workout_sequence,
    });
    expect(next?.id).toBe("B");
  });

  it("wraps around the rotation (A after B)", () => {
    const next = nextSequentialWorkout(seqTemplates, { next_workout_sequence: 3 });
    expect(next?.id).toBe("A");
  });

  it("does NOT advance the pointer when an optional workout is completed", () => {
    const state = advanceAfterCompletion(
      "sequential",
      seqTemplates,
      baseEnrolment,
      "C", // optional recovery
      1,
      12
    );
    expect(state.next_workout_sequence).toBe(1); // still pointing at A
  });

  it("missed calendar days never break the sequence (time-independent)", () => {
    // Regardless of dates, a user on sequence 2 always sees B next.
    const next = nextSequentialWorkout(seqTemplates, { next_workout_sequence: 2 });
    expect(next?.id).toBe("B");
  });
});

describe("weekly-split scheduling", () => {
  const split: EngineTemplate[] = [
    { id: "push", name: "Push", sequence_order: null, week_position: 1, day_of_week: null, is_optional: false },
    { id: "pull", name: "Pull", sequence_order: null, week_position: 2, day_of_week: null, is_optional: false },
    { id: "legs", name: "Legs", sequence_order: null, week_position: 3, day_of_week: null, is_optional: false },
  ];
  const now = new Date("2026-07-15T12:00:00Z"); // a Wednesday

  it("returns the first slot when nothing is done", () => {
    const next = nextWeeklySplitWorkout(split, [], now);
    expect(next?.id).toBe("push");
  });

  it("skips completed slots within the same week", () => {
    const sessions: EngineSession[] = [
      { workout_template_id: "push", status: "completed", completed_at: "2026-07-14T10:00:00Z", week_number: 1 },
    ];
    const next = nextWeeklySplitWorkout(split, sessions, now);
    expect(next?.id).toBe("pull");
  });

  it("target equals number of slots", () => {
    expect(weeklyTargetFor("weekly_split", split, baseEnrolment)).toBe(3);
  });

  it("last-week completion is detected via progress", () => {
    const sessions: EngineSession[] = [
      { workout_template_id: "push", status: "completed", completed_at: "2026-07-13T10:00:00Z", week_number: 1 },
      { workout_template_id: "pull", status: "completed", completed_at: "2026-07-14T10:00:00Z", week_number: 1 },
      { workout_template_id: "legs", status: "completed", completed_at: "2026-07-15T10:00:00Z", week_number: 1 },
    ];
    const p = weeklyProgress("weekly_split", split, baseEnrolment, sessions, now);
    expect(p.target).toBe(3);
    expect(p.remaining).toBe(0);
    expect(p.percent).toBe(100);
    expect(nextWeeklySplitWorkout(split, sessions, now)).toBeNull();
  });
});

describe("calendar scheduling", () => {
  const cal: EngineTemplate[] = [
    { id: "mon", name: "Mon", sequence_order: null, week_position: null, day_of_week: 1, is_optional: false },
    { id: "wed", name: "Wed", sequence_order: null, week_position: null, day_of_week: 3, is_optional: false },
    { id: "fri", name: "Fri", sequence_order: null, week_position: null, day_of_week: 5, is_optional: false },
  ];

  it("picks today's workout first", () => {
    const wed = new Date("2026-07-15T09:00:00Z"); // Wednesday
    const next = nextCalendarWorkout(cal, [], wed);
    expect(next?.id).toBe("wed");
  });
});

describe("weekly progress + week advancement", () => {
  const now = new Date("2026-07-15T12:00:00Z");

  it("counts only this week's completed sessions", () => {
    const sessions: EngineSession[] = [
      { workout_template_id: "A", status: "completed", completed_at: "2026-07-14T10:00:00Z", week_number: 1 },
      { workout_template_id: "B", status: "completed", completed_at: "2026-06-01T10:00:00Z", week_number: 1 }, // old
      { workout_template_id: "A", status: "in_progress", completed_at: null, week_number: 1 },
    ];
    expect(completedThisWeek(sessions, now)).toHaveLength(1);
  });

  it("advances the week once the weekly target is met", () => {
    const state = advanceAfterCompletion(
      "sequential",
      seqTemplates,
      baseEnrolment,
      "A",
      3, // 3rd session this week, target is 3
      12
    );
    expect(state.current_week).toBe(2);
  });

  it("does not advance the week before the target is met", () => {
    const state = advanceAfterCompletion(
      "sequential",
      seqTemplates,
      baseEnrolment,
      "A",
      1,
      12
    );
    expect(state.current_week).toBe(1);
  });

  it("never advances the week beyond program duration", () => {
    const finalWeek: EngineEnrolment = { ...baseEnrolment, current_week: 12 };
    const state = advanceAfterCompletion(
      "sequential",
      seqTemplates,
      finalWeek,
      "A",
      3,
      12
    );
    expect(state.current_week).toBe(12);
  });
});
