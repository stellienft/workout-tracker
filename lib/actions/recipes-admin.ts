"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext, isAdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { searchSpoonacular } from "@/lib/spoonacular";

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

  let recipes;
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

  const rows = recipes.map((r) => ({
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
  }));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .upsert(rows, { onConflict: "external_id", ignoreDuplicates: false })
    .select("id");
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/nutrition/recipes");
  revalidatePath("/admin/recipes");
  return { ok: true as const, imported: data?.length ?? rows.length };
}
