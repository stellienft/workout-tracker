/**
 * Small pure helpers for the in-workout tools: plate loading, 1RM estimation
 * and warm-up ramps. Unit-agnostic — the caller passes kg or lb consistently.
 */

import { estimate1RM } from "@/lib/ai/analysis";

export type Unit = "kg" | "lb";

// Standard plates available in each unit (heaviest → lightest).
export const PLATES: Record<Unit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

export const DEFAULT_BAR: Record<Unit, number> = { kg: 20, lb: 45 };

export interface PlateResult {
  perSide: { plate: number; count: number }[];
  achievable: number; // the closest weight the plates can actually make
  leftover: number; // weight that couldn't be loaded (target - achievable)
}

/**
 * Break a target barbell weight into plates PER SIDE, greedily from the
 * heaviest plate down. Returns the closest achievable weight too, since not
 * every target is loadable.
 */
export function plateBreakdown(
  target: number,
  bar: number,
  plates: number[]
): PlateResult {
  const perSideWeight = (target - bar) / 2;
  if (perSideWeight <= 0) {
    return { perSide: [], achievable: bar, leftover: Math.max(0, target - bar) };
  }
  let remaining = perSideWeight;
  const perSide: { plate: number; count: number }[] = [];
  for (const plate of [...plates].sort((a, b) => b - a)) {
    const count = Math.floor(remaining / plate + 1e-9);
    if (count > 0) {
      perSide.push({ plate, count });
      remaining -= count * plate;
    }
  }
  const loadedPerSide = perSideWeight - remaining;
  return {
    perSide,
    achievable: Math.round((bar + loadedPerSide * 2) * 100) / 100,
    leftover: Math.round(remaining * 2 * 100) / 100,
  };
}

/** Epley one-rep max, rounded. Re-exported through the analysis engine. */
export function oneRepMax(weight: number, reps: number): number {
  return Math.round(estimate1RM(weight, reps) * 10) / 10;
}

// Percent-of-1RM → the reps you can usually hit (Epley inverse, rounded).
export const RM_PERCENTS = [100, 95, 90, 85, 80, 75, 70, 65, 60];

export function percentTable(oneRm: number, unit: Unit) {
  const step = unit === "kg" ? 2.5 : 5;
  const round = (w: number) => Math.round(w / step) * step;
  return RM_PERCENTS.map((pct) => {
    const weight = round((oneRm * pct) / 100);
    // Epley inverse: reps ≈ 30 * (1RM/w - 1)
    const reps = weight > 0 ? Math.max(1, Math.round(30 * (oneRm / weight - 1))) : 0;
    return { pct, weight, reps };
  });
}

export interface WarmupSet {
  weight: number;
  reps: number;
  label: string;
}

/**
 * A sensible warm-up ramp toward a working weight: empty bar, then rising
 * percentages with falling reps. Skips steps at or above the working weight.
 */
export function warmupSets(working: number, bar: number, unit: Unit): WarmupSet[] {
  const step = unit === "kg" ? 2.5 : 5;
  const round = (w: number) => Math.max(bar, Math.round(w / step) * step);
  if (working <= bar) {
    return [{ weight: bar, reps: 10, label: "Bar" }];
  }
  const ramp = [
    { pct: 0, reps: 8, label: "Empty bar" },
    { pct: 0.4, reps: 5, label: "40%" },
    { pct: 0.6, reps: 3, label: "60%" },
    { pct: 0.8, reps: 2, label: "80%" },
    { pct: 0.9, reps: 1, label: "90%" },
  ];
  const out: WarmupSet[] = [];
  for (const s of ramp) {
    const weight = s.pct === 0 ? bar : round(working * s.pct);
    if (weight >= working) continue;
    if (out.length && out[out.length - 1].weight === weight) continue;
    out.push({ weight, reps: s.reps, label: s.label });
  }
  return out;
}
