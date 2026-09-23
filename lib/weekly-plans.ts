import type { MealPlanMeal, PlanTag } from "@/lib/meal-plans";

/**
 * Weekly meal plans — a full 7 days with a DIFFERENT menu each day, so a member
 * can add a varied week to their diary in one tap. Macros per day stay roughly
 * consistent for the goal; the exact per-day total is computed in the UI.
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
  perDayKcal: number; // rough target the days land near
  days: WeeklyDay[]; // length 7
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Small helper so the data below stays compact: [slot, label, title, kcal, p, c, f].
type M = [MealPlanMeal["slot"], string, string, number, number, number, number];
const meal = ([slot, label, title, calories, protein_g, carbs_g, fat_g]: M): MealPlanMeal => ({
  slot,
  label,
  title,
  calories,
  protein_g,
  carbs_g,
  fat_g,
});
const week = (rows: M[][]): WeeklyDay[] =>
  rows.map((day, i) => ({ day: DAYS[i], meals: day.map(meal) }));

export const WEEKLY_PLANS: WeeklyPlan[] = [
  {
    id: "muscle-gain-week",
    name: "Muscle Gain — 7 Day",
    tag: "Gain",
    summary: "A week of varied, protein-rich meals in a moderate surplus for steady lean gains.",
    perDayKcal: 2600,
    days: week([
      [
        ["breakfast", "Breakfast", "Oats, whey, banana & peanut butter", 620, 40, 80, 16],
        ["lunch", "Lunch", "Chicken, rice, veg & olive oil", 720, 55, 80, 20],
        ["dinner", "Dinner", "Beef stir-fry with noodles", 780, 50, 85, 26],
        ["snack", "Snack", "Greek yoghurt, granola & berries", 380, 30, 45, 8],
      ],
      [
        ["breakfast", "Breakfast", "Eggs, avocado & toast", 560, 28, 40, 30],
        ["lunch", "Lunch", "Turkey & cheese wrap with salad", 680, 48, 60, 22],
        ["dinner", "Dinner", "Salmon, potatoes & greens", 720, 45, 60, 30],
        ["snack", "Snack", "Cottage cheese, pineapple & nuts", 360, 30, 22, 14],
      ],
      [
        ["breakfast", "Breakfast", "Protein pancakes, berries & yoghurt", 600, 45, 70, 12],
        ["lunch", "Lunch", "Beef burrito bowl (rice, beans, salsa)", 780, 50, 85, 24],
        ["dinner", "Dinner", "Chicken pasta, tomato & parmesan", 760, 52, 80, 24],
        ["snack", "Snack", "Whey shake & an apple", 320, 32, 35, 5],
      ],
      [
        ["breakfast", "Breakfast", "Greek yoghurt bowl, granola, honey & seeds", 520, 35, 55, 16],
        ["lunch", "Lunch", "Tuna pasta salad", 700, 45, 75, 20],
        ["dinner", "Dinner", "Pork chops, sweet potato mash & veg", 760, 48, 60, 32],
        ["snack", "Snack", "Peanut butter & banana on toast", 380, 14, 48, 16],
      ],
      [
        ["breakfast", "Breakfast", "3-egg cheese & veg omelette with toast", 560, 34, 30, 32],
        ["lunch", "Lunch", "Chicken katsu with rice & slaw", 800, 50, 85, 28],
        ["dinner", "Dinner", "Beef mince tacos", 720, 48, 70, 26],
        ["snack", "Snack", "Protein shake with oats", 340, 32, 40, 6],
      ],
      [
        ["breakfast", "Breakfast", "Overnight oats, whey, berries & PB", 600, 40, 75, 16],
        ["lunch", "Lunch", "Salmon poke bowl (rice, edamame)", 720, 45, 75, 24],
        ["dinner", "Dinner", "Roast chicken, potatoes & veg", 760, 55, 60, 28],
        ["snack", "Snack", "Yoghurt, honey & walnuts", 360, 24, 30, 16],
      ],
      [
        ["breakfast", "Breakfast", "Eggs, beans, toast & mushrooms", 620, 34, 55, 28],
        ["lunch", "Lunch", "Steak sandwich & sweet potato fries", 820, 48, 75, 34],
        ["dinner", "Dinner", "Prawn & chicken paella", 720, 50, 80, 20],
        ["snack", "Snack", "Cottage cheese, berries & granola", 340, 30, 35, 8],
      ],
    ]),
  },
  {
    id: "maintenance-week",
    name: "Maintenance — 7 Day",
    tag: "Maintain",
    summary: "A balanced, varied week at maintenance to hold weight and recomp over time.",
    perDayKcal: 2150,
    days: week([
      [
        ["breakfast", "Breakfast", "Greek yoghurt, granola, berries & whey", 450, 38, 45, 10],
        ["lunch", "Lunch", "Chicken salad wrap", 580, 45, 45, 20],
        ["dinner", "Dinner", "Salmon, roasted veg & a small potato", 620, 42, 40, 26],
        ["snack", "Snack", "Apple & two boiled eggs", 260, 15, 20, 12],
      ],
      [
        ["breakfast", "Breakfast", "Scrambled eggs & wholegrain toast", 420, 26, 30, 20],
        ["lunch", "Lunch", "Chicken, quinoa & roasted veg bowl", 600, 45, 55, 18],
        ["dinner", "Dinner", "Beef & vegetable stir-fry with rice", 680, 45, 65, 22],
        ["snack", "Snack", "Cottage cheese with pineapple", 250, 28, 20, 4],
      ],
      [
        ["breakfast", "Breakfast", "Overnight oats with yoghurt & berries", 430, 28, 55, 10],
        ["lunch", "Lunch", "Tuna & bean salad", 520, 42, 40, 18],
        ["dinner", "Dinner", "Chicken fajitas (peppers, wrap)", 650, 45, 60, 20],
        ["snack", "Snack", "Protein shake & a pear", 250, 28, 25, 3],
      ],
      [
        ["breakfast", "Breakfast", "Smoothie: whey, banana, oats & milk", 450, 35, 55, 8],
        ["lunch", "Lunch", "Turkey meatballs, pasta & tomato", 620, 45, 60, 18],
        ["dinner", "Dinner", "White fish, potatoes & greens", 600, 42, 45, 22],
        ["snack", "Snack", "Greek yoghurt & mixed nuts", 260, 20, 12, 14],
      ],
      [
        ["breakfast", "Breakfast", "Eggs, avocado & toast", 480, 24, 30, 28],
        ["lunch", "Lunch", "Chicken Caesar (light) with croutons", 560, 45, 35, 24],
        ["dinner", "Dinner", "Lean beef chilli with rice", 640, 45, 60, 20],
        ["snack", "Snack", "Skyr with berries", 220, 24, 18, 2],
      ],
      [
        ["breakfast", "Breakfast", "Protein porridge with berries", 430, 30, 55, 8],
        ["lunch", "Lunch", "Prawn stir-fry with noodles", 560, 38, 60, 16],
        ["dinner", "Dinner", "Grilled chicken, sweet potato & salad", 620, 48, 45, 22],
        ["snack", "Snack", "Hummus with veg & wholegrain crackers", 280, 12, 30, 12],
      ],
      [
        ["breakfast", "Breakfast", "Poached eggs on toast with spinach", 420, 26, 30, 20],
        ["lunch", "Lunch", "Roast chicken salad with potatoes", 600, 45, 45, 22],
        ["dinner", "Dinner", "Salmon fillet, rice & broccoli", 640, 42, 55, 24],
        ["snack", "Snack", "Cottage cheese & sliced peach", 240, 26, 18, 4],
      ],
    ]),
  },
  {
    id: "cutting-week",
    name: "Cutting — 7 Day",
    tag: "Cut",
    summary: "A varied week in a moderate deficit with protein kept high to hold muscle.",
    perDayKcal: 1800,
    days: week([
      [
        ["breakfast", "Breakfast", "Egg-white & spinach scramble, 1 toast", 300, 30, 25, 8],
        ["lunch", "Lunch", "Chicken breast, big salad, light dressing", 420, 50, 20, 14],
        ["dinner", "Dinner", "White fish, greens & sweet potato", 500, 45, 40, 15],
        ["snack", "Snack", "Low-fat Greek yoghurt with berries", 200, 25, 18, 2],
      ],
      [
        ["breakfast", "Breakfast", "Protein oats with berries", 320, 30, 35, 6],
        ["lunch", "Lunch", "Tuna salad, light dressing", 360, 42, 15, 12],
        ["dinner", "Dinner", "Lean steak, veg & a small potato", 520, 45, 35, 18],
        ["snack", "Snack", "Protein shake", 160, 30, 6, 2],
      ],
      [
        ["breakfast", "Breakfast", "Skyr with berries & a little granola", 300, 30, 35, 4],
        ["lunch", "Lunch", "Chicken & vegetable soup with a roll", 420, 40, 40, 10],
        ["dinner", "Dinner", "Turkey mince chilli (light) with rice", 500, 45, 45, 12],
        ["snack", "Snack", "Carrot sticks & a boiled egg", 160, 12, 12, 8],
      ],
      [
        ["breakfast", "Breakfast", "2-egg & egg-white omelette, veg", 300, 30, 10, 16],
        ["lunch", "Lunch", "Prawn & salad rice-paper rolls", 380, 32, 40, 8],
        ["dinner", "Dinner", "Grilled chicken, greens & quinoa", 520, 48, 40, 14],
        ["snack", "Snack", "Low-fat cottage cheese & cucumber", 180, 26, 8, 4],
      ],
      [
        ["breakfast", "Breakfast", "Protein smoothie (whey, berries, spinach)", 260, 30, 20, 4],
        ["lunch", "Lunch", "Chicken & quinoa salad", 440, 45, 35, 12],
        ["dinner", "Dinner", "White fish tacos (2, light)", 520, 42, 45, 16],
        ["snack", "Snack", "Greek yoghurt & a few almonds", 220, 22, 12, 8],
      ],
      [
        ["breakfast", "Breakfast", "Scrambled eggs & wilted spinach", 280, 26, 6, 18],
        ["lunch", "Lunch", "Turkey & salad wholegrain wrap", 420, 40, 40, 12],
        ["dinner", "Dinner", "Lean beef stir-fry with veg", 500, 45, 30, 18],
        ["snack", "Snack", "Skyr with cinnamon & berries", 200, 26, 16, 2],
      ],
      [
        ["breakfast", "Breakfast", "Protein pancakes (light) with berries", 320, 30, 35, 6],
        ["lunch", "Lunch", "Chicken breast, roast veg & couscous", 460, 45, 40, 12],
        ["dinner", "Dinner", "Baked salmon, asparagus & salad", 520, 40, 20, 26],
        ["snack", "Snack", "Low-fat Greek yoghurt", 180, 24, 14, 2],
      ],
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
