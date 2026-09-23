import type { MacroTargets } from "@/lib/nutrition";

/**
 * Nutrition "stage" plans — the calorie/macro strategy that pairs with each
 * phase of training (building, maintaining/recomping, cutting). These are
 * strategy presets: they set daily targets from the member's bodyweight, and
 * the full macro calculator ("Set up macros") is there for fine-tuning.
 */

export type StageId = "gain" | "maintain" | "lose";

export interface StagePlan {
  id: StageId;
  stage: string; // short tag, e.g. "Build"
  name: string;
  summary: string;
  pairsWith: string; // program(s) this stage suits
  calorieStance: string; // human description
  proteinPerKg: number; // g protein per kg bodyweight
  fatPct: number; // fraction of calories from fat
  calorieFactor: number; // multiplier on estimated maintenance
  tips: string[];
}

// Rough maintenance calories per kg of bodyweight at a moderate activity level.
// The full calculator refines this from height/age/lean mass and activity.
const MAINTENANCE_KCAL_PER_KG = 32;

export const STAGE_PLANS: StagePlan[] = [
  {
    id: "gain",
    stage: "Build",
    name: "Muscle-Building Surplus",
    summary:
      "A slight calorie surplus so hard training has the fuel to build new muscle — without piling on fat.",
    pairsWith: "Mass Blueprint · Classic Physique Split",
    calorieStance: "~12% above maintenance",
    proteinPerKg: 2.0,
    fatPct: 0.25,
    calorieFactor: 1.12,
    tips: [
      "Aim to gain about 0.25–0.5% of bodyweight per week. If the scale climbs faster than that, trim carbs a little.",
      "Put most of your carbs around training for better sessions and recovery.",
      "Keep protein steady every day — muscle is built from a consistent supply.",
    ],
  },
  {
    id: "maintain",
    stage: "Maintain · Recomp",
    name: "Maintenance & Recomposition",
    summary:
      "Hold your weight steady and let consistent training slowly trade fat for muscle.",
    pairsWith: "Classic Physique Split",
    calorieStance: "At maintenance",
    proteinPerKg: 2.2,
    fatPct: 0.25,
    calorieFactor: 1.0,
    tips: [
      "Recomposition is slowest but works well for newer or returning lifters — be patient and let the mirror, not just the scale, tell the story.",
      "Keep protein high and push your lifts; that's the signal to build muscle at a stable weight.",
      "A steady scale week-to-week is success here, not a plateau.",
    ],
  },
  {
    id: "lose",
    stage: "Cut · Define",
    name: "Cutting / Fat Loss",
    summary:
      "A moderate calorie deficit with protein kept high to strip fat while holding on to the muscle you've built.",
    pairsWith: "Shred & Define",
    calorieStance: "~20% below maintenance",
    proteinPerKg: 2.4,
    fatPct: 0.28,
    calorieFactor: 0.8,
    tips: [
      "Target about 0.5–0.75% of bodyweight lost per week. Faster than that and you risk losing muscle.",
      "Keep lifting heavy — trying to hold your strength is what tells your body to keep the muscle.",
      "If fat loss stalls, add steps or easy cardio before cutting calories further. Consider a diet break every 6–10 weeks.",
    ],
  },
];

/** Compute daily targets for a stage from bodyweight (moderate activity base). */
export function computeStageTargets(
  weightKg: number,
  plan: StagePlan
): MacroTargets {
  const maintenance = weightKg * MAINTENANCE_KCAL_PER_KG;
  let calories = Math.round((maintenance * plan.calorieFactor) / 10) * 10;
  calories = Math.max(1200, Math.min(6000, calories));

  const protein_g = Math.round(weightKg * plan.proteinPerKg);
  const fat_g = Math.round((calories * plan.fatPct) / 9);
  const carbs_g = Math.max(
    0,
    Math.round((calories - protein_g * 4 - fat_g * 9) / 4)
  );
  return { calories, protein_g, carbs_g, fat_g };
}
