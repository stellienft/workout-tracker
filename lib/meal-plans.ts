import type { MealSlot } from "@/lib/nutrition";
import { recipeBySlug } from "@/lib/recipe-catalog";

/**
 * Ready-made full-day meal plans. Each is a complete day of eating composed
 * from real recipes in the catalog, so every meal matches a recipe in the
 * library with identical macros. Add a whole day to the diary in one tap.
 */

export type PlanTag =
  | "Bulk"
  | "Gain"
  | "Maintain"
  | "Cut"
  | "Vegetarian"
  | "Athlete"
  | "Dairy-free"
  | "Budget"
  | "Quick";

export interface MealPlanMeal {
  slot: MealSlot; // where it lands in the diary
  label: string; // display heading, e.g. "Breakfast"
  title: string; // the plate (matches a real recipe title)
  recipeSlug: string; // the catalog recipe this meal is
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface FullMealPlan {
  id: string;
  name: string;
  tag: PlanTag;
  summary: string;
  meals: MealPlanMeal[];
}

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/** Build a plan meal from a catalog recipe (macros/title come from the recipe). */
export function cm(slug: string, label?: string): MealPlanMeal {
  const r = recipeBySlug[slug];
  if (!r) throw new Error(`Unknown recipe slug: ${slug}`);
  return {
    slot: r.slot,
    label: label ?? SLOT_LABEL[r.slot],
    title: r.title,
    recipeSlug: r.slug,
    calories: r.calories,
    protein_g: r.protein_g,
    carbs_g: r.carbs_g,
    fat_g: r.fat_g,
  };
}

// A rough recipe-search keyword from a meal title (its main food).
const KEYWORD_STOP = new Set([
  "with","and","the","of","a","an","made","water","small","big","light","mixed",
  "tinned","pre","cooked","microwave","overnight","protein","two","dairy-free",
  "wholegrain","low-fat","fresh","serve","handful","little","few",
]);
export function mealKeyword(title: string): string {
  const words = title.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  return words.find((w) => w.length > 2 && !KEYWORD_STOP.has(w)) ?? words[0] ?? "";
}

export function planTotals(plan: FullMealPlan) {
  return plan.meals.reduce(
    (t, m) => ({
      calories: t.calories + m.calories,
      protein_g: t.protein_g + m.protein_g,
      carbs_g: t.carbs_g + m.carbs_g,
      fat_g: t.fat_g + m.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

export const MEAL_PLANS: FullMealPlan[] = [
  {
    id: "lean-bulk",
    name: "Lean Bulk",
    tag: "Bulk",
    summary: "A big, high-carb day to fuel serious mass without going overboard on fat.",
    meals: [
      cm("ares-pb-banana-protein-oats"),
      cm("ares-chicken-rice-bowl"),
      cm("ares-whey-shake-banana", "Around training"),
      cm("ares-beef-noodle-stirfry"),
      cm("ares-greek-yogurt-granola-bowl", "Evening"),
    ],
  },
  {
    id: "muscle-gain",
    name: "Muscle Gain",
    tag: "Gain",
    summary: "A moderate surplus with balanced macros — steady lean gains.",
    meals: [
      cm("ares-berry-protein-pancakes"),
      cm("ares-beef-burrito-bowl"),
      cm("ares-whey-shake-banana", "Around training"),
      cm("ares-baked-salmon-potatoes"),
      cm("ares-cottage-cheese-pineapple", "Evening"),
    ],
  },
  {
    id: "maintenance",
    name: "Maintenance & Recomp",
    tag: "Maintain",
    summary: "Balanced, protein-forward eating to hold weight and slowly recomp.",
    meals: [
      cm("ares-greek-yogurt-granola-bowl"),
      cm("ares-chicken-salad-wrap"),
      cm("ares-apple-boiled-eggs"),
      cm("ares-baked-salmon-potatoes"),
      cm("ares-cottage-cheese-pineapple", "Evening"),
    ],
  },
  {
    id: "high-protein-cut",
    name: "High-Protein Cut",
    tag: "Cut",
    summary: "A moderate deficit with protein kept high to hold muscle while leaning out.",
    meals: [
      cm("ares-egg-white-spinach-scramble"),
      cm("ares-chicken-caesar"),
      cm("ares-skyr-berries", "Snack"),
      cm("ares-white-fish-sweet-potato"),
      cm("ares-protein-shake", "Evening"),
    ],
  },
  {
    id: "aggressive-cut",
    name: "Aggressive Cut",
    tag: "Cut",
    summary: "A tighter deficit for faster fat loss — protein stays high, fats and carbs lean.",
    meals: [
      cm("ares-skyr-seed-bowl"),
      cm("ares-tuna-salad-bowl"),
      cm("ares-protein-shake", "Snack"),
      cm("ares-white-fish-sweet-potato"),
      cm("ares-skyr-berries", "Evening"),
    ],
  },
  {
    id: "vegetarian-high-protein",
    name: "Vegetarian High-Protein",
    tag: "Vegetarian",
    summary: "Plenty of protein without meat — dairy, legumes and soy do the heavy lifting.",
    meals: [
      cm("ares-greek-yogurt-granola-bowl"),
      cm("ares-lentil-chickpea-bowl"),
      cm("ares-yogurt-nuts", "Snack"),
      cm("ares-halloumi-quinoa-plate"),
      cm("ares-edamame-nuts", "Evening"),
    ],
  },
  {
    id: "athlete-fuel",
    name: "Athlete Fuel",
    tag: "Athlete",
    summary: "A big-training-day plan — lots of carbs around sessions for performance and recovery.",
    meals: [
      cm("ares-pb-banana-protein-oats"),
      cm("ares-chicken-rice-bowl"),
      cm("ares-whey-oat-smoothie", "Around training"),
      cm("ares-roast-chicken-potatoes"),
      cm("ares-greek-yogurt-granola-bowl", "Evening"),
      cm("ares-pb-banana-toast", "Supper"),
    ],
  },
  {
    id: "dairy-free-high-protein",
    name: "Dairy-Free High-Protein",
    tag: "Dairy-free",
    summary: "Plenty of protein with no dairy — eggs, fish, meat, tofu and edamame.",
    meals: [
      cm("ares-avocado-eggs-toast"),
      cm("ares-chicken-rice-bowl"),
      cm("ares-edamame-nuts", "Snack"),
      cm("ares-baked-salmon-potatoes"),
      cm("ares-apple-boiled-eggs", "Evening"),
    ],
  },
  {
    id: "budget-high-protein",
    name: "Budget High-Protein",
    tag: "Budget",
    summary: "Cheap, filling and protein-dense — oats, tinned fish, mince and eggs.",
    meals: [
      cm("ares-whey-oat-smoothie"),
      cm("ares-tuna-pasta-salad"),
      cm("ares-pb-banana-toast", "Snack"),
      cm("ares-beef-chilli-rice"),
      cm("ares-apple-boiled-eggs", "Evening"),
    ],
  },
  {
    id: "grab-and-go",
    name: "Grab & Go (No-Cook)",
    tag: "Quick",
    summary: "A busy-day plan with almost no cooking — assemble, don't cook.",
    meals: [
      cm("ares-berry-overnight-oats"),
      cm("ares-chicken-salad-wrap"),
      cm("ares-whey-shake-banana", "Snack"),
      cm("ares-tuna-salad-bowl"),
      cm("ares-hummus-veg-crackers", "Evening"),
    ],
  },
  {
    id: "hard-gainer",
    name: "Hard Gainer",
    tag: "Bulk",
    summary: "A big, calorie-dense day for those who struggle to gain — eat often.",
    meals: [
      cm("ares-pb-banana-protein-oats"),
      cm("ares-beef-burrito-bowl"),
      cm("ares-whey-oat-smoothie", "Around training"),
      cm("ares-pork-sweet-potato-mash"),
      cm("ares-greek-yogurt-granola-bowl", "Evening"),
      cm("ares-pb-banana-toast", "Supper"),
    ],
  },
];
