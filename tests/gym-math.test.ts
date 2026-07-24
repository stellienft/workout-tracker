import { describe, it, expect } from "vitest";
import {
  plateBreakdown,
  oneRepMax,
  percentTable,
  warmupSets,
  PLATES,
} from "@/lib/gym-math";

describe("plateBreakdown", () => {
  it("loads 100kg on a 20kg bar (40kg per side, heaviest-first)", () => {
    const r = plateBreakdown(100, 20, PLATES.kg);
    expect(r.achievable).toBe(100);
    expect(r.leftover).toBe(0);
    const total = r.perSide.reduce((a, p) => a + p.plate * p.count, 0);
    expect(total).toBe(40); // 25 + 15
  });

  it("greedily mixes plates", () => {
    const r = plateBreakdown(142.5, 20, PLATES.kg); // 61.25 per side
    expect(r.achievable).toBe(142.5);
    expect(r.leftover).toBe(0);
    // 25 + 20 + 15 + 1.25 = 61.25
    const total = r.perSide.reduce((a, p) => a + p.plate * p.count, 0);
    expect(total).toBeCloseTo(61.25, 2);
  });

  it("reports the closest loadable weight when a target is impossible", () => {
    const r = plateBreakdown(101, 20, PLATES.kg); // 40.5 per side, min plate 1.25
    expect(r.leftover).toBeGreaterThan(0);
    expect(r.achievable).toBeLessThan(101);
  });

  it("returns just the bar when target <= bar", () => {
    const r = plateBreakdown(20, 20, PLATES.kg);
    expect(r.perSide).toEqual([]);
    expect(r.achievable).toBe(20);
  });
});

describe("oneRepMax", () => {
  it("estimates via Epley", () => {
    expect(oneRepMax(100, 5)).toBeCloseTo(116.7, 1);
    expect(oneRepMax(100, 1)).toBe(100);
  });
});

describe("percentTable", () => {
  it("rounds to loadable increments and estimates reps", () => {
    const t = percentTable(100, "kg");
    expect(t[0]).toEqual({ pct: 100, weight: 100, reps: 1 });
    const sixty = t.find((r) => r.pct === 60)!;
    expect(sixty.weight).toBe(60);
    expect(sixty.reps).toBeGreaterThan(10);
  });
});

describe("warmupSets", () => {
  it("ramps from the bar up to below the working set", () => {
    const sets = warmupSets(100, 20, "kg");
    expect(sets[0].label).toBe("Empty bar");
    expect(sets[0].weight).toBe(20);
    expect(sets.every((s) => s.weight < 100)).toBe(true);
    // reps should trend down as weight climbs
    expect(sets[0].reps).toBeGreaterThanOrEqual(sets[sets.length - 1].reps);
  });

  it("just the bar for a light working weight", () => {
    const sets = warmupSets(20, 20, "kg");
    expect(sets).toHaveLength(1);
  });
});
