"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext, isAdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { NormalizedRecipe } from "@/lib/spoonacular";
import { searchTheMealDb, listByCategory } from "@/lib/themealdb";

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
    source: "themealdb",
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

/** Delete every recipe in the library (admin only). Meal entries keep their
 * copied macros (recipe_id is set null); favourites cascade away. */
export async function clearAllRecipes() {
  const { roles } = await getAuthContext();
  if (!isAdminRole(roles)) return { ok: false as const, error: "Admins only" };

  const supabase = await createClient();
  const { count: before } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true });

  // Delete all rows (the predicate matches every row).
  const { error } = await supabase.from("recipes").delete().not("id", "is", null);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/nutrition/recipes");
  revalidatePath("/nutrition");
  revalidatePath("/admin/recipes");
  return { ok: true as const, removed: before ?? 0 };
}

/**
 * Import recipes from TheMealDB into the local library (admin only).
 * Dedupes on external_id, so re-running a query tops up rather than duplicates.
 */
export async function importRecipes(input: { query: string; number?: number }) {
  const { roles } = await getAuthContext();
  if (!isAdminRole(roles)) return { ok: false as const, error: "Admins only" };

  const parsed = z
    .object({
      query: z.string().min(2).max(80),
      number: z.coerce.number().int().min(1).max(25).default(15),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };

  let recipes: NormalizedRecipe[];
  try {
    recipes = await searchTheMealDb({
      query: parsed.data.query,
      number: parsed.data.number,
    });
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "TheMealDB request failed",
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

// A spread across TheMealDB categories to fill the library with cohesive imagery.
const STARTER_CATEGORIES: { category: string; number: number }[] = [
  { category: "Breakfast", number: 8 },
  { category: "Chicken", number: 10 },
  { category: "Beef", number: 8 },
  { category: "Seafood", number: 8 },
  { category: "Pasta", number: 8 },
  { category: "Vegetarian", number: 8 },
  { category: "Vegan", number: 8 },
  { category: "Pork", number: 6 },
  { category: "Lamb", number: 6 },
  { category: "Side", number: 6 },
  { category: "Dessert", number: 8 },
  { category: "Miscellaneous", number: 6 },
];

/** One-click starter: pull a spread of recipes across every category. */
export async function seedStarterRecipes() {
  const { roles } = await getAuthContext();
  if (!isAdminRole(roles)) return { ok: false as const, error: "Admins only" };

  const collected: NormalizedRecipe[] = [];
  let firstError: string | null = null;

  for (const s of STARTER_CATEGORIES) {
    try {
      const batch = await listByCategory(s.category, s.number);
      collected.push(...batch);
    } catch (err) {
      if (!firstError) firstError = err instanceof Error ? err.message : String(err);
    }
  }

  if (collected.length === 0) {
    return { ok: false as const, error: firstError ?? "No recipes returned from TheMealDB." };
  }

  try {
    const { imported } = await upsertRecipes(collected);
    revalidatePath("/nutrition/recipes");
    revalidatePath("/admin/recipes");
    return {
      ok: true as const,
      imported,
      message: `Imported ${imported} recipes across the categories.`,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Could not save recipes",
    };
  }
}
