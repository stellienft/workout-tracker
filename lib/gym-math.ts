/**
 * Small pure helpers for the in-workout tools: plate loading, 1RM estimation
 * and warm-up ramps. Unit-agnostic — the caller passes kg or lb consistently.
 */

import { estimate1RM, roundLoad } from "@/lib/ai/analysis";

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

/**
 * Parse a rep target string into a low/high range. Handles "8-12", "8–12"
 * (en dash), "5", and "3×8-12" (sets × reps — only the rep part is used).
 * Returns null for time/hold targets, which don't get weight progression.
 */
export function parseRepRange(repTarget: string): { low: number; high: number } | null {
  if (!repTarget) return null;
  const t = repTarget.toLowerCase();
  if (/sec|min|:|hold/.test(t)) return null; // time-based, not weight progression
  const repPart = /[x×]/.test(t) ? (t.split(/[x×]/).pop() ?? "") : t;
  const nums = (repPart.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0);
  if (nums.length === 0) return null;
  const a = nums[0];
  const b = nums[nums.length - 1];
  return { low: Math.min(a, b), high: Math.max(a, b) };
}

export interface ProgressionSet {
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
}

export interface Progression {
  action: "increase" | "hold" | "build" | "deload";
  weightKg: number;
  reps: number; // suggested target reps at that weight
  headline: string; // short call to action, e.g. "Try 42.5 kg × 8"
  detail: string; // the why
}

function fmtKg(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/**
 * Double-progression coach: given last session's working sets and the rep
 * target, suggest the next load. Hit the top of the range (fresh enough) →
 * add weight and drop to the bottom; inside the range → same weight, +1 rep;
 * below the range → hold and rebuild. Pure and unit-tested. kg throughout.
 */
export function progressionSuggestion(
  previous: ProgressionSet[],
  repTarget: string,
  incrementKg = 2.5
): Progression | null {
  const range = parseRepRange(repTarget);
  if (!range) return null;

  const sets = previous.filter(
    (s): s is { weight_kg: number; reps: number; rpe: number | null } =>
      (s.weight_kg ?? 0) > 0 && (s.reps ?? 0) > 0
  );
  if (sets.length === 0) return null;

  const topWeight = Math.max(...sets.map((s) => s.weight_kg));
  const topSets = sets.filter((s) => s.weight_kg === topWeight);
  const minReps = Math.min(...topSets.map((s) => s.reps));
  const rpes = topSets.map((s) => s.rpe).filter((r): r is number => r != null);
  const maxRpe = rpes.length ? Math.max(...rpes) : null;
  const fresh = maxRpe == null || maxRpe <= 9; // had a couple more reps in the tank
  const grind = maxRpe != null && maxRpe >= 9.5; // basically a max-effort set
  const rpeNote = maxRpe != null ? ` at RPE ${fmtKg(maxRpe)}` : "";

  // Hit (or beat) the top of the range.
  if (minReps >= range.high) {
    // Auto-regulation: only add load if the last top set wasn't a max grind.
    if (grind) {
      return {
        action: "hold",
        weightKg: topWeight,
        reps: range.high,
        headline: `Repeat ${fmtKg(topWeight)} kg × ${range.high}`,
        detail: `You reached the top of the range but it was a max-effort set${rpeNote}. Repeat ${fmtKg(
          topWeight
        )} kg and make it feel smoother before adding load.`,
      };
    }
    const weightKg = roundLoad(topWeight + incrementKg);
    return {
      action: "increase",
      weightKg,
      reps: range.low,
      headline: `Try ${fmtKg(weightKg)} kg × ${range.low}`,
      detail: `Last time you hit ${minReps} reps at ${fmtKg(topWeight)} kg${rpeNote} — add ${fmtKg(
        weightKg - topWeight
      )} kg and start at the bottom of the range.`,
    };
  }

  // Inside the range: same weight, chase one more rep.
  if (minReps >= range.low) {
    const reps = Math.min(minReps + 1, range.high);
    return {
      action: "hold",
      weightKg: topWeight,
      reps,
      headline: `Aim for ${fmtKg(topWeight)} kg × ${reps}`,
      detail: `Last set landed${rpeNote || " mid-range"}. Stay at ${fmtKg(
        topWeight
      )} kg and add a rep — reach ${range.high} to move up.`,
    };
  }

  // Below the range: if it was already a max-effort grind, back off; otherwise
  // hold and rebuild the reps.
  if (grind) {
    const weightKg = roundLoad(topWeight * 0.9);
    return {
      action: "deload",
      weightKg,
      reps: range.low,
      headline: `Drop to ${fmtKg(weightKg)} kg × ${range.low}`,
      detail: `You stalled at ${minReps} reps and it was max effort${rpeNote}. Back off ~10% to ${fmtKg(
        weightKg
      )} kg, rebuild clean reps, then climb again.`,
    };
  }

  return {
    action: "build",
    weightKg: topWeight,
    reps: range.low,
    headline: `Rebuild ${fmtKg(topWeight)} kg × ${range.low}`,
    detail: `You managed ${minReps} last time. Keep ${fmtKg(
      topWeight
    )} kg and work back to ${range.low} clean reps.`,
  };
}
