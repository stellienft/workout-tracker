"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext, isAdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { searchSpoonacular, type NormalizedRecipe } from "@/lib/spoonacular";

function toRow(r: NormalizedRecipe) {
  return {
    slug: r.slug,
    title: r.title,
    category: r.category,
    image_url: r.imageUrl,
    description: r.description,
    calories: r.calories,
    protein_g: r.protein_g,
    carbs_g: r.carbs_g,
    fat_g: r.fat_g,
    servings: r.servings,
    prep_minutes: r.prepMinutes,
    tags: r.tags,
    ingredients: r.ingredients,
    steps: r.steps,
    source: "spoonacular",
    external_id: r.externalId,
  };
}

async function upsertRecipes(recipes: NormalizedRecipe[]) {
  // De-dupe within the batch so one upsert doesn't hit the same external_id twice.
  const byId = new Map(recipes.map((r) => [r.externalId, r]));
  const rows = Array.from(byId.values()).map(toRow);
  if (rows.length === 0) return { imported: 0 };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .upsert(rows, { onConflict: "external_id", ignoreDuplicates: false })
    .select("id");
  if (error) throw new Error(error.message);
  return { imported: data?.length ?? rows.length };
}

/**
 * Import recipes from Spoonacular into the local library (admin only).
 * Dedupes on external_id, so re-running a query tops up rather than duplicates.
 */
export async function importSpoonacularRecipes(input: {
  query: string;
  category?: string;
  number?: number;
}) {
  const { roles } = await getAuthContext();
  if (!isAdminRole(roles)) return { ok: false as const, error: "Admins only" };

  const parsed = z
    .object({
      query: z.string().min(2).max(80),
      category: z.string().max(40).optional(),
      number: z.coerce.number().int().min(1).max(25).default(10),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };

  let recipes: NormalizedRecipe[];
  try {
    recipes = await searchSpoonacular({
      query: parsed.data.query,
      number: parsed.data.number,
      category: parsed.data.category,
    });
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Spoonacular request failed",
    };
  }

  if (recipes.length === 0) {
    return { ok: true as const, imported: 0, message: "No recipes found for that search." };
  }

  try {
    const { imported } = await upsertRecipes(recipes);
    revalidatePath("/nutrition/recipes");
    revalidatePath("/admin/recipes");
    return { ok: true as const, imported };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Could not save recipes",
    };
  }
}

// A spread of searches that fills the library across every category.
const STARTER_SEARCHES: { query: string; category: string; number: number }[] = [
  { query: "high protein chicken", category: "High-Protein", number: 6 },
  { query: "lean beef dinner", category: "High-Protein", number: 4 },
  { query: "low carb dinner", category: "Low-Carb", number: 6 },
  { query: "vegan bowl", category: "Vegan", number: 6 },
  { query: "vegetarian high protein", category: "Vegetarian", number: 5 },
  { query: "healthy breakfast", category: "Breakfast", number: 6 },
  { query: "protein smoothie", category: "Smoothies", number: 5 },
  { query: "healthy snack", category: "Snacks", number: 5 },
  { query: "chicken salad", category: "Salads", number: 5 },
  { query: "vegetable soup", category: "Soups", number: 4 },
  { query: "healthy dessert", category: "Desserts", number: 4 },
];

/**
 * One-click starter: run a spread of category searches and import them all.
 * Continues past an individual failed search (e.g. transient), and reports if
 * the daily quota is hit partway.
 */
export async function seedStarterRecipes() {
  const { roles } = await getAuthContext();
  if (!isAdminRole(roles)) return { ok: false as const, error: "Admins only" };

  const collected: NormalizedRecipe[] = [];
  let quotaHit = false;
  let firstError: string | null = null;

  for (const s of STARTER_SEARCHES) {
    try {
      const batch = await searchSpoonacular({
        query: s.query,
        number: s.number,
        category: s.category,
      });
      collected.push(...batch);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!firstError) firstError = msg;
      // 402 = out of quota / points for the day; stop early.
      if (/402|quota|points|limit/i.test(msg)) {
        quotaHit = true;
        break;
      }
    }
  }

  if (collected.length === 0) {
    return {
      ok: false as const,
      error: firstError ?? "No recipes returned. Check your Spoonacular key.",
    };
  }

  try {
    const { imported } = await upsertRecipes(collected);
    revalidatePath("/nutrition/recipes");
    revalidatePath("/admin/recipes");
    return {
      ok: true as const,
      imported,
      message: quotaHit
        ? `Imported ${imported} recipes, then your Spoonacular daily quota ran out — run this again tomorrow to top up.`
        : `Imported ${imported} recipes across the categories.`,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Could not save recipes",
    };
  }
}
