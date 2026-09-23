import type { MealSlot } from "@/lib/nutrition";

/**
 * Ready-made full-day meal plans. Each is a complete day of eating with per-meal
 * macros, so a member can browse them and add a whole day to their food diary in
 * one tap. Original, generic suggestions — swap foods to taste.
 */

export type PlanTag = "Bulk" | "Gain" | "Maintain" | "Cut" | "Vegetarian" | "Athlete";

export interface MealPlanMeal {
  slot: MealSlot; // where it lands in the diary
  label: string; // display heading, e.g. "Breakfast"
  title: string; // the plate
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
    id: "lean-bulk-3000",
    name: "Lean Bulk",
    tag: "Bulk",
    summary: "A big, high-carb day to fuel serious mass without going overboard on fat.",
    meals: [
      { slot: "breakfast", label: "Breakfast", title: "Oats with whey, banana & peanut butter", calories: 650, protein_g: 40, carbs_g: 80, fat_g: 18 },
      { slot: "lunch", label: "Lunch", title: "Chicken, rice, avocado & veg", calories: 780, protein_g: 55, carbs_g: 85, fat_g: 22 },
      { slot: "snack", label: "Snack", title: "Greek yoghurt, granola & honey", calories: 400, protein_g: 30, carbs_g: 50, fat_g: 8 },
      { slot: "dinner", label: "Dinner", title: "Beef mince pasta with tomato & cheese", calories: 820, protein_g: 55, carbs_g: 80, fat_g: 30 },
      { slot: "snack", label: "Evening", title: "Milk, whey shake & a handful of nuts", calories: 350, protein_g: 30, carbs_g: 20, fat_g: 15 },
    ],
  },
  {
    id: "muscle-gain-2600",
    name: "Muscle Gain",
    tag: "Gain",
    summary: "A moderate surplus with balanced macros — steady lean gains.",
    meals: [
      { slot: "breakfast", label: "Breakfast", title: "Eggs on toast with avocado", calories: 540, protein_g: 30, carbs_g: 40, fat_g: 26 },
      { slot: "lunch", label: "Lunch", title: "Chicken wrap with salad", calories: 650, protein_g: 50, carbs_g: 55, fat_g: 22 },
      { slot: "snack", label: "Snack", title: "Whey shake & a banana", calories: 300, protein_g: 30, carbs_g: 35, fat_g: 3 },
      { slot: "dinner", label: "Dinner", title: "Salmon, rice & vegetables", calories: 700, protein_g: 45, carbs_g: 65, fat_g: 25 },
      { slot: "snack", label: "Evening", title: "Cottage cheese with berries", calories: 260, protein_g: 28, carbs_g: 18, fat_g: 6 },
    ],
  },
  {
    id: "maintenance-2200",
    name: "Maintenance & Recomp",
    tag: "Maintain",
    summary: "Balanced, protein-forward eating to hold weight and slowly recomp.",
    meals: [
      { slot: "breakfast", label: "Breakfast", title: "Greek yoghurt, berries, granola & whey", calories: 450, protein_g: 40, carbs_g: 45, fat_g: 10 },
      { slot: "lunch", label: "Lunch", title: "Chicken, salad, rice & olive oil", calories: 600, protein_g: 50, carbs_g: 50, fat_g: 20 },
      { slot: "snack", label: "Snack", title: "Apple with two boiled eggs", calories: 250, protein_g: 15, carbs_g: 20, fat_g: 12 },
      { slot: "dinner", label: "Dinner", title: "Salmon, roasted veg & a small potato", calories: 650, protein_g: 45, carbs_g: 45, fat_g: 28 },
      { slot: "snack", label: "Evening", title: "Cottage cheese with pineapple", calories: 250, protein_g: 30, carbs_g: 20, fat_g: 4 },
    ],
  },
  {
    id: "high-protein-cut-1800",
    name: "High-Protein Cut",
    tag: "Cut",
    summary: "A moderate deficit with protein kept high to hold muscle while leaning out.",
    meals: [
      { slot: "breakfast", label: "Breakfast", title: "Egg-white & spinach scramble, 1 slice toast", calories: 300, protein_g: 30, carbs_g: 25, fat_g: 8 },
      { slot: "lunch", label: "Lunch", title: "Chicken breast, big salad, light dressing", calories: 420, protein_g: 50, carbs_g: 20, fat_g: 14 },
      { slot: "snack", label: "Snack", title: "Whey shake & a small handful of almonds", calories: 250, protein_g: 30, carbs_g: 12, fat_g: 10 },
      { slot: "dinner", label: "Dinner", title: "White fish or lean steak, greens, sweet potato", calories: 500, protein_g: 45, carbs_g: 40, fat_g: 15 },
      { slot: "snack", label: "Evening", title: "Low-fat Greek yoghurt with berries", calories: 200, protein_g: 25, carbs_g: 18, fat_g: 2 },
    ],
  },
  {
    id: "aggressive-cut-1500",
    name: "Aggressive Cut",
    tag: "Cut",
    summary: "A tighter deficit for faster fat loss — protein stays high, fats and carbs lean.",
    meals: [
      { slot: "breakfast", label: "Breakfast", title: "Protein oats (made with water) & berries", calories: 300, protein_g: 30, carbs_g: 35, fat_g: 5 },
      { slot: "lunch", label: "Lunch", title: "Tuna salad, light dressing", calories: 350, protein_g: 40, carbs_g: 15, fat_g: 12 },
      { slot: "snack", label: "Snack", title: "Protein shake", calories: 150, protein_g: 30, carbs_g: 5, fat_g: 2 },
      { slot: "dinner", label: "Dinner", title: "Chicken breast, veg & a small serve of rice", calories: 450, protein_g: 45, carbs_g: 40, fat_g: 10 },
      { slot: "snack", label: "Evening", title: "Skyr or low-fat yoghurt", calories: 200, protein_g: 25, carbs_g: 15, fat_g: 3 },
    ],
  },
  {
    id: "vegetarian-high-protein-2100",
    name: "Vegetarian High-Protein",
    tag: "Vegetarian",
    summary: "Plenty of protein without meat — legumes, dairy and soy do the heavy lifting.",
    meals: [
      { slot: "breakfast", label: "Breakfast", title: "Tofu scramble on toast", calories: 420, protein_g: 28, carbs_g: 35, fat_g: 20 },
      { slot: "lunch", label: "Lunch", title: "Lentil & chickpea bowl with feta", calories: 600, protein_g: 30, carbs_g: 70, fat_g: 22 },
      { slot: "snack", label: "Snack", title: "Greek yoghurt, whey & berries", calories: 350, protein_g: 40, carbs_g: 35, fat_g: 6 },
      { slot: "dinner", label: "Dinner", title: "Halloumi or paneer, quinoa & vegetables", calories: 600, protein_g: 35, carbs_g: 55, fat_g: 28 },
      { slot: "snack", label: "Evening", title: "Edamame with a glass of milk", calories: 200, protein_g: 20, carbs_g: 15, fat_g: 8 },
    ],
  },
  {
    id: "athlete-fuel-3200",
    name: "Athlete Fuel",
    tag: "Athlete",
    summary: "A big-training-day plan — lots of carbs around sessions for performance and recovery.",
    meals: [
      { slot: "breakfast", label: "Breakfast", title: "Oats, whey, berries, peanut butter & milk", calories: 700, protein_g: 45, carbs_g: 90, fat_g: 20 },
      { slot: "lunch", label: "Lunch", title: "Chicken, rice, veg & olive oil", calories: 800, protein_g: 55, carbs_g: 90, fat_g: 22 },
      { slot: "snack", label: "Around training", title: "Shake, rice cakes & honey", calories: 400, protein_g: 30, carbs_g: 60, fat_g: 5 },
      { slot: "dinner", label: "Dinner", title: "Steak, potatoes & vegetables", calories: 850, protein_g: 55, carbs_g: 80, fat_g: 32 },
      { slot: "snack", label: "Evening", title: "Yoghurt, granola & nuts", calories: 450, protein_g: 30, carbs_g: 45, fat_g: 18 },
    ],
  },
];
