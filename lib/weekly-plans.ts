import type { MealPlanMeal, PlanTag } from "@/lib/meal-plans";
import { cm } from "@/lib/meal-plans";

/**
 * Weekly meal plans — a full 7 days with a DIFFERENT menu each day, composed
 * from real recipes in the catalog so every meal matches a recipe. Macros per
 * day stay roughly consistent for the goal; the exact total is computed in UI.
 */

export interface WeeklyDay {
  day: string; // "Mon", "Tue", …
  meals: MealPlanMeal[];
}

export interface WeeklyPlan {
  id: string;
  name: string;
  tag: PlanTag;
  summary: string;
  perDayKcal: number;
  days: WeeklyDay[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Build a week from rows of [slug, optional label] per day.
const week = (rows: [string, string?][][]): WeeklyDay[] =>
  rows.map((day, i) => ({ day: DAYS[i], meals: day.map(([s, l]) => cm(s, l)) }));

export const WEEKLY_PLANS: WeeklyPlan[] = [
  {
    id: "muscle-gain-week",
    name: "Muscle Gain — 7 Day",
    tag: "Gain",
    summary: "A week of varied, protein-rich meals in a moderate surplus for steady lean gains.",
    perDayKcal: 2600,
    days: week([
      [["ares-pb-banana-protein-oats"], ["ares-chicken-rice-bowl"], ["ares-whey-shake-banana", "Around training"], ["ares-beef-noodle-stirfry"], ["ares-yogurt-nuts", "Evening"]],
      [["ares-berry-protein-pancakes"], ["ares-beef-burrito-bowl"], ["ares-whey-oat-smoothie", "Around training"], ["ares-baked-salmon-potatoes"], ["ares-cottage-cheese-pineapple", "Evening"]],
      [["ares-veggie-cheese-omelette"], ["ares-chicken-quinoa-bowl"], ["ares-whey-shake-banana", "Around training"], ["ares-roast-chicken-potatoes"], ["ares-pb-banana-toast", "Evening"]],
      [["ares-whey-oat-smoothie"], ["ares-salmon-poke-bowl"], ["ares-whey-shake-banana", "Around training"], ["ares-pork-sweet-potato-mash"], ["ares-yogurt-nuts", "Evening"]],
      [["ares-avocado-eggs-toast"], ["ares-chicken-caesar"], ["ares-whey-oat-smoothie", "Around training"], ["ares-beef-mince-tacos"], ["ares-cottage-cheese-pineapple", "Evening"]],
      [["ares-pb-banana-protein-oats"], ["ares-tuna-pasta-salad"], ["ares-whey-shake-banana", "Around training"], ["ares-chicken-fajitas"], ["ares-yogurt-nuts", "Evening"]],
      [["ares-berry-overnight-oats"], ["ares-beef-burrito-bowl"], ["ares-whey-oat-smoothie", "Around training"], ["ares-baked-salmon-potatoes"], ["ares-pb-banana-toast", "Evening"]],
    ]),
  },
  {
    id: "maintenance-week",
    name: "Maintenance — 7 Day",
    tag: "Maintain",
    summary: "A balanced, varied week at maintenance to hold weight and recomp over time.",
    perDayKcal: 2100,
    days: week([
      [["ares-greek-yogurt-granola-bowl"], ["ares-chicken-rice-bowl"], ["ares-baked-salmon-potatoes"], ["ares-cottage-cheese-pineapple", "Evening"]],
      [["ares-veggie-cheese-omelette"], ["ares-chicken-quinoa-bowl"], ["ares-beef-chilli-rice"], ["ares-yogurt-nuts", "Evening"]],
      [["ares-berry-overnight-oats"], ["ares-tuna-pasta-salad"], ["ares-chicken-fajitas"], ["ares-skyr-berries", "Evening"]],
      [["ares-whey-oat-smoothie"], ["ares-lentil-chickpea-bowl"], ["ares-white-fish-sweet-potato"], ["ares-yogurt-nuts", "Evening"]],
      [["ares-avocado-eggs-toast"], ["ares-chicken-caesar"], ["ares-beef-chilli-rice"], ["ares-skyr-berries", "Evening"]],
      [["ares-berry-protein-pancakes"], ["ares-prawn-noodle-stirfry"], ["ares-roast-chicken-potatoes"], ["ares-hummus-veg-crackers", "Evening"]],
      [["ares-greek-yogurt-granola-bowl"], ["ares-salmon-poke-bowl"], ["ares-halloumi-quinoa-plate"], ["ares-cottage-cheese-pineapple", "Evening"]],
    ]),
  },
  {
    id: "cutting-week",
    name: "Cutting — 7 Day",
    tag: "Cut",
    summary: "A varied week in a moderate deficit with protein kept high to hold muscle.",
    perDayKcal: 1600,
    days: week([
      [["ares-egg-white-spinach-scramble"], ["ares-chicken-caesar"], ["ares-white-fish-sweet-potato"], ["ares-skyr-berries", "Evening"]],
      [["ares-skyr-seed-bowl"], ["ares-chicken-quinoa-bowl"], ["ares-white-fish-sweet-potato"], ["ares-protein-shake", "Evening"]],
      [["ares-egg-white-spinach-scramble"], ["ares-chicken-salad-wrap"], ["ares-prawn-noodle-stirfry"], ["ares-skyr-berries", "Evening"]],
      [["ares-skyr-seed-bowl"], ["ares-tuna-salad-bowl"], ["ares-white-fish-sweet-potato"], ["ares-protein-shake", "Evening"]],
      [["ares-egg-white-spinach-scramble"], ["ares-tuna-pasta-salad"], ["ares-white-fish-sweet-potato"], ["ares-skyr-berries", "Evening"]],
      [["ares-skyr-seed-bowl"], ["ares-chicken-salad-wrap"], ["ares-prawn-noodle-stirfry"], ["ares-protein-shake", "Evening"]],
      [["ares-egg-white-spinach-scramble"], ["ares-chicken-caesar"], ["ares-white-fish-sweet-potato"], ["ares-skyr-berries", "Evening"]],
    ]),
  },
];

export function weeklyDayTotals(day: WeeklyDay) {
  return day.meals.reduce(
    (t, m) => ({
      calories: t.calories + m.calories,
      protein_g: t.protein_g + m.protein_g,
      carbs_g: t.carbs_g + m.carbs_g,
      fat_g: t.fat_g + m.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}
