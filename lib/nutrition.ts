export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const RECIPE_CATEGORIES = [
  "Breakfast",
  "Chicken",
  "Beef",
  "Pork",
  "Lamb",
  "Seafood",
  "Pasta",
  "Side",
  "Vegetarian",
  "Vegan",
  "Dessert",
  "Miscellaneous",
];

/**
 * Suggest daily macro targets from what we know about the member. Uses body
 * weight when available (protein at ~2 g/kg, ~30 kcal/kg maintenance) and nudges
 * calories by the goal direction; falls back to sensible defaults otherwise.
 */
export function suggestTargets(input: {
  weightKg?: number | null;
  goalName?: string | null;
  weeklyFrequency?: number | null;
}): MacroTargets {
  const weight = input.weightKg && input.weightKg > 30 ? input.weightKg : null;
  const goal = (input.goalName ?? "").toLowerCase();

  // Base maintenance calories.
  const activity = (input.weeklyFrequency ?? 3) >= 5 ? 33 : 30;
  let calories = weight ? Math.round(weight * activity) : 2200;

  // Goal direction.
  if (/(loss|lean|cut|shred|fat)/.test(goal)) calories = Math.round(calories * 0.82);
  else if (/(gain|muscle|bulk|strength|mass)/.test(goal))
    calories = Math.round(calories * 1.1);

  const protein_g = weight
    ? Math.round(weight * 2)
    : Math.round((calories * 0.3) / 4);
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.max(
    0,
    Math.round((calories - protein_g * 4 - fat_g * 9) / 4)
  );

  return { calories, protein_g, carbs_g, fat_g };
}

// ---------------------------------------------------------------------------
// Guided macro calculator
// ---------------------------------------------------------------------------

export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "athlete";
export type NutritionGoal = "lose" | "maintain" | "gain";
export type PlanMethod = "body_comp" | "stats";

export const ACTIVITY_LEVELS: {
  value: ActivityLevel;
  label: string;
  hint: string;
  multiplier: number;
}[] = [
  { value: "sedentary", label: "Sedentary", hint: "Desk job, little exercise", multiplier: 1.2 },
  { value: "light", label: "Lightly active", hint: "Light exercise 1–3 days/week", multiplier: 1.375 },
  { value: "moderate", label: "Moderately active", hint: "Exercise 3–5 days/week", multiplier: 1.55 },
  { value: "active", label: "Very active", hint: "Hard exercise 6–7 days/week", multiplier: 1.725 },
  { value: "athlete", label: "Athlete", hint: "Twice-daily or physical job", multiplier: 1.9 },
];

export const GOAL_OPTIONS: {
  value: NutritionGoal;
  label: string;
  hint: string;
  calAdj: number;
}[] = [
  { value: "lose", label: "Lose fat", hint: "Calorie deficit", calAdj: -0.2 },
  { value: "maintain", label: "Maintain / recomp", hint: "Hold weight", calAdj: 0 },
  { value: "gain", label: "Build muscle", hint: "Lean surplus", calAdj: 0.12 },
];

export interface NutritionPlanInput {
  method: PlanMethod;
  sex?: Sex | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  leanMassKg?: number | null;
  activity: ActivityLevel;
  goal: NutritionGoal;
}

export interface NutritionPlan extends MacroTargets {
  bmr: number;
  tdee: number;
  method: PlanMethod;
  proteinBasis: string;
  explanation: string;
}

/**
 * Work out daily calories and macros from a member's stats or — more accurately
 * — their body-composition scan.
 *
 * When lean mass is known we use Katch–McArdle (BMR = 370 + 21.6 × lean kg),
 * which needs no sex/height/age guesswork and sets protein from lean tissue.
 * Otherwise we fall back to Mifflin–St Jeor from sex, age, height and weight.
 * TDEE = BMR × activity multiplier; the goal shifts calories up or down.
 */
export function computeNutritionPlan(input: NutritionPlanInput): NutritionPlan | null {
  const activity =
    ACTIVITY_LEVELS.find((a) => a.value === input.activity) ?? ACTIVITY_LEVELS[2];
  const goal = GOAL_OPTIONS.find((g) => g.value === input.goal) ?? GOAL_OPTIONS[1];

  const weight = input.weightKg && input.weightKg > 30 ? input.weightKg : null;
  const lean = input.leanMassKg && input.leanMassKg > 20 ? input.leanMassKg : null;

  let bmr: number;
  let proteinG: number;
  let proteinBasis: string;
  let explanation: string;

  if (input.method === "body_comp" && lean) {
    // Katch–McArdle from lean body mass.
    bmr = 370 + 21.6 * lean;
    // Protein scaled to lean tissue — the muscle we're actually feeding.
    proteinG = Math.round(lean * 2.2);
    proteinBasis = `${lean.toFixed(1)} kg lean × 2.2 g`;
    explanation =
      `Calculated from your body-composition scan. Your resting burn comes from ` +
      `${lean.toFixed(1)} kg of lean mass (Katch–McArdle), and protein is set to ` +
      `2.2 g per kg of that lean tissue — more accurate than a bodyweight estimate.`;
  } else {
    // Mifflin–St Jeor needs sex, age, height and weight.
    const sex = input.sex ?? "male";
    const age = input.age && input.age > 0 ? input.age : 30;
    const height = input.heightCm && input.heightCm > 100 ? input.heightCm : null;
    if (!weight || !height) return null;
    bmr =
      10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161);
    // In a deficit protein runs higher to protect muscle.
    const perKg = input.goal === "lose" ? 2.2 : 2.0;
    proteinG = Math.round(weight * perKg);
    proteinBasis = `${weight.toFixed(0)} kg × ${perKg} g`;
    explanation =
      `Calculated from your stats (Mifflin–St Jeor). Add a body-composition scan ` +
      `to base this on lean mass instead — it's more precise.`;
  }

  const tdee = bmr * activity.multiplier;
  let calories = Math.round((tdee * (1 + goal.calAdj)) / 10) * 10;
  calories = Math.max(1200, Math.min(6000, calories));

  // Fat at ~25% of calories, carbohydrates fill the rest.
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.max(
    0,
    Math.round((calories - proteinG * 4 - fatG * 9) / 4)
  );

  return {
    calories,
    protein_g: proteinG,
    carbs_g: carbsG,
    fat_g: fatG,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    method: input.method === "body_comp" && lean ? "body_comp" : "stats",
    proteinBasis,
    explanation,
  };
}

/** Scale a recipe's per-serving macros by a serving count, rounded. */
export function scaleMacros(
  recipe: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
  servings: number
): MacroTargets {
  const s = servings > 0 ? servings : 1;
  return {
    calories: Math.round(recipe.calories * s),
    protein_g: Math.round(recipe.protein_g * s),
    carbs_g: Math.round(recipe.carbs_g * s),
    fat_g: Math.round(recipe.fat_g * s),
  };
}
