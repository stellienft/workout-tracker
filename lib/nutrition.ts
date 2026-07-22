export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const RECIPE_CATEGORIES = [
  "High-Protein",
  "Low-Carb",
  "Vegan",
  "Vegetarian",
  "Bowls",
  "Salads",
  "Breakfast",
  "Smoothies",
  "Snacks",
  "Soups",
  "Desserts",
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
