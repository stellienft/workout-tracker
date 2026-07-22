/**
 * Minimal Spoonacular client. Needs SPOONACULAR_API_KEY in the environment.
 * We use complexSearch with recipe information + nutrition so a single request
 * returns image, macros, ingredients and steps ready to import.
 */

const BASE = "https://api.spoonacular.com";

export interface NormalizedRecipe {
  externalId: string;
  slug: string;
  title: string;
  category: string;
  imageUrl: string | null;
  description: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  servings: number;
  prepMinutes: number;
  tags: string[];
  ingredients: string[];
  steps: string[];
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function nutrient(nutrients: { name: string; amount: number }[], name: string) {
  return Math.round(nutrients?.find((n) => n.name === name)?.amount ?? 0);
}

// Loosely map Spoonacular metadata onto our category chips.
function categoryFor(r: SpoonRecipe, fallback: string): string {
  const dt = (r.dishTypes ?? []).map((d) => d.toLowerCase());
  const diets = (r.diets ?? []).map((d) => d.toLowerCase());
  if (diets.includes("vegan")) return "Vegan";
  if (diets.includes("vegetarian")) return "Vegetarian";
  if (dt.some((d) => d.includes("breakfast"))) return "Breakfast";
  if (dt.some((d) => d.includes("soup"))) return "Soups";
  if (dt.some((d) => d.includes("salad"))) return "Salads";
  if (dt.some((d) => d.includes("dessert"))) return "Desserts";
  if (dt.some((d) => d.includes("drink") || d.includes("beverage"))) return "Smoothies";
  if (dt.some((d) => d.includes("snack") || d.includes("appetizer"))) return "Snacks";
  if (r.veryHealthy || (r.dishTypes ?? []).includes("main course")) return "Bowls";
  return fallback;
}

interface SpoonRecipe {
  id: number;
  title: string;
  image?: string;
  servings?: number;
  readyInMinutes?: number;
  summary?: string;
  dishTypes?: string[];
  diets?: string[];
  veryHealthy?: boolean;
  extendedIngredients?: { original?: string; name?: string }[];
  analyzedInstructions?: { steps: { step: string }[] }[];
  nutrition?: { nutrients: { name: string; amount: number }[] };
}

export function normalizeSpoonacular(
  r: SpoonRecipe,
  fallbackCategory: string
): NormalizedRecipe {
  const nutrients = r.nutrition?.nutrients ?? [];
  const steps =
    r.analyzedInstructions?.[0]?.steps?.map((s) => s.step).filter(Boolean) ?? [];
  const ingredients =
    r.extendedIngredients
      ?.map((i) => i.original || i.name || "")
      .filter(Boolean) ?? [];
  const summary = r.summary
    ? r.summary.replace(/<[^>]+>/g, "").slice(0, 280)
    : null;

  return {
    externalId: `spoonacular:${r.id}`,
    slug: `${slugify(r.title)}-sp${r.id}`,
    title: r.title,
    category: categoryFor(r, fallbackCategory),
    imageUrl: r.image ?? null,
    description: summary,
    calories: nutrient(nutrients, "Calories"),
    protein_g: nutrient(nutrients, "Protein"),
    carbs_g: nutrient(nutrients, "Carbohydrates"),
    fat_g: nutrient(nutrients, "Fat"),
    servings: r.servings ?? 1,
    prepMinutes: r.readyInMinutes ?? 20,
    tags: [...(r.diets ?? []), ...(r.dishTypes ?? [])].slice(0, 8),
    ingredients: ingredients.slice(0, 30),
    steps,
  };
}

/** Search Spoonacular and return normalized recipes ready to import. */
export async function searchSpoonacular(opts: {
  query: string;
  number?: number;
  category?: string;
}): Promise<NormalizedRecipe[]> {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) throw new Error("SPOONACULAR_API_KEY is not configured");

  const params = new URLSearchParams({
    apiKey: key,
    query: opts.query || "",
    number: String(Math.min(opts.number ?? 10, 25)),
    addRecipeInformation: "true",
    addRecipeNutrition: "true",
    fillIngredients: "true",
    instructionsRequired: "true",
  });

  const res = await fetch(`${BASE}/recipes/complexSearch?${params.toString()}`, {
    // Recipe data is static enough to cache briefly; avoids burning quota.
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Spoonacular error ${res.status}${text ? `: ${text.slice(0, 160)}` : ""}`
    );
  }
  const data = (await res.json()) as { results?: SpoonRecipe[] };
  const fallback = opts.category || "Bowls";
  return (data.results ?? []).map((r) => normalizeSpoonacular(r, fallback));
}
