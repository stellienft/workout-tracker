import { describe, it, expect } from "vitest";
import { parseRepRange, progressionSuggestion } from "@/lib/gym-math";

describe("parseRepRange", () => {
  it("parses a hyphen range", () => {
    expect(parseRepRange("8-12")).toEqual({ low: 8, high: 12 });
  });
  it("parses an en-dash range", () => {
    expect(parseRepRange("8–12")).toEqual({ low: 8, high: 12 });
  });
  it("parses a single number as a point range", () => {
    expect(parseRepRange("5")).toEqual({ low: 5, high: 5 });
  });
  it("uses only the rep part of sets×reps", () => {
    expect(parseRepRange("3×8-12")).toEqual({ low: 8, high: 12 });
    expect(parseRepRange("5x5")).toEqual({ low: 5, high: 5 });
  });
  it("returns null for time/hold targets", () => {
    expect(parseRepRange("30 sec")).toBeNull();
    expect(parseRepRange("1:00 hold")).toBeNull();
    expect(parseRepRange("")).toBeNull();
  });
});

describe("progressionSuggestion", () => {
  it("adds weight when the top of the range was hit fresh", () => {
    const s = progressionSuggestion(
      [{ weight_kg: 40, reps: 12, rpe: 8 }],
      "8-12"
    );
    expect(s?.action).toBe("increase");
    expect(s?.weightKg).toBe(42.5);
    expect(s?.reps).toBe(8);
  });

  it("holds weight and adds a rep when inside the range", () => {
    const s = progressionSuggestion(
      [{ weight_kg: 40, reps: 9, rpe: null }],
      "8-12"
    );
    expect(s?.action).toBe("hold");
    expect(s?.weightKg).toBe(40);
    expect(s?.reps).toBe(10);
  });

  it("does not push past the top of the range when holding", () => {
    const s = progressionSuggestion(
      [{ weight_kg: 40, reps: 12, rpe: 10 }], // top reps but a grind (RPE 10)
      "8-12"
    );
    expect(s?.action).toBe("hold");
    expect(s?.reps).toBe(12);
  });

  it("rebuilds when below the range", () => {
    const s = progressionSuggestion(
      [{ weight_kg: 40, reps: 6, rpe: null }],
      "8-12"
    );
    expect(s?.action).toBe("build");
    expect(s?.weightKg).toBe(40);
    expect(s?.reps).toBe(8);
  });

  it("uses the minimum reps across the heaviest sets", () => {
    const s = progressionSuggestion(
      [
        { weight_kg: 40, reps: 12, rpe: 7 },
        { weight_kg: 40, reps: 10, rpe: 9 },
      ],
      "8-12"
    );
    // min reps at top weight is 10 → still inside range, so hold
    expect(s?.action).toBe("hold");
    expect(s?.reps).toBe(11);
  });

  it("honours a larger increment for big lifts", () => {
    const s = progressionSuggestion(
      [{ weight_kg: 100, reps: 5, rpe: 8 }],
      "5",
      5
    );
    expect(s?.action).toBe("increase");
    expect(s?.weightKg).toBe(105);
  });

  it("returns null when there is no usable history", () => {
    expect(progressionSuggestion([], "8-12")).toBeNull();
    expect(
      progressionSuggestion([{ weight_kg: null, reps: null, rpe: null }], "8-12")
    ).toBeNull();
  });

  it("returns null for time-based targets", () => {
    expect(
      progressionSuggestion([{ weight_kg: 0, reps: null, rpe: null }], "45 sec")
    ).toBeNull();
  });
});
