"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { scaleMacros } from "@/lib/nutrition";
import {
  parseRecipeFromHtml,
  isSafeRecipeUrl,
  type ParsedRecipe,
} from "@/lib/recipe-import";

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const targetsSchema = z.object({
  calories: z.coerce.number().int().min(800).max(8000),
  protein_g: z.coerce.number().int().min(0).max(500),
  carbs_g: z.coerce.number().int().min(0).max(1000),
  fat_g: z.coerce.number().int().min(0).max(400),
});

export async function saveNutritionTargets(input: z.input<typeof targetsSchema>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = targetsSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { error } = await supabase.from("nutrition_targets").upsert(
    { user_id: user.id, ...parsed.data, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/nutrition");
  return { ok: true as const };
}

const mealEnum = z.enum(["breakfast", "lunch", "dinner", "snack"]);

/** Add a recipe to a day/meal — macros are computed server-side from the recipe. */
export async function addRecipeToMeal(input: {
  date: string;
  meal: string;
  recipeId: string;
  servings?: number;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      meal: mealEnum,
      recipeId: z.string().uuid(),
      servings: z.coerce.number().min(0.25).max(20).default(1),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const d = parsed.data;

  const { data: recipe } = await supabase
    .from("recipes")
    .select("title, calories, protein_g, carbs_g, fat_g")
    .eq("id", d.recipeId)
    .maybeSingle();
  if (!recipe) return { ok: false as const, error: "Recipe not found" };

  const m = scaleMacros(recipe, d.servings);
  const { error } = await supabase.from("meal_entries").insert({
    user_id: user.id,
    entry_date: d.date,
    meal: d.meal,
    recipe_id: d.recipeId,
    title: recipe.title,
    servings: d.servings,
    ...m,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/nutrition");
  return { ok: true as const };
}

/** Quick-add a custom food with manually entered macros. */
export async function addCustomFood(input: {
  date: string;
  meal: string;
  title: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      meal: mealEnum,
      title: z.string().min(1).max(120),
      calories: z.coerce.number().int().min(0).max(5000),
      protein_g: z.coerce.number().int().min(0).max(400),
      carbs_g: z.coerce.number().int().min(0).max(600),
      fat_g: z.coerce.number().int().min(0).max(300),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const d = parsed.data;

  const { error } = await supabase.from("meal_entries").insert({
    user_id: user.id,
    entry_date: d.date,
    meal: d.meal,
    title: d.title,
    calories: d.calories,
    protein_g: d.protein_g,
    carbs_g: d.carbs_g,
    fat_g: d.fat_g,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/nutrition");
  return { ok: true as const };
}

/**
 * Fetch a recipe web page and parse its structured data (schema.org Recipe
 * JSON-LD) into a preview. No DB write — the member confirms before saving.
 */
export async function previewRecipeFromUrl(
  rawUrl: string
): Promise<
  | { ok: true; recipe: ParsedRecipe }
  | { ok: false; error: string }
> {
  const { user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const url = (rawUrl || "").trim();
  if (!url) return { ok: false as const, error: "Paste a recipe link first." };
  if (!isSafeRecipeUrl(url))
    return { ok: false as const, error: "That doesn't look like a valid recipe URL." };

  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // Some sites serve stripped markup to unknown agents; present as a
        // normal browser so the JSON-LD block is included.
        "User-Agent":
          "Mozilla/5.0 (compatible; StellioFitBot/1.0; +https://stellio.com.au)",
        Accept: "text/html,application/xhtml+xml",
      },
    }).finally(() => clearTimeout(timeout));
    if (!res.ok)
      return { ok: false as const, error: `Couldn't load the page (${res.status}).` };
    const type = res.headers.get("content-type") ?? "";
    if (type && !type.includes("html") && !type.includes("xml"))
      return { ok: false as const, error: "That link isn't a web page." };
    // Cap the body so a huge page can't blow up memory.
    html = (await res.text()).slice(0, 2_500_000);
  } catch {
    return { ok: false as const, error: "Couldn't reach that link. Check the URL and try again." };
  }

  const recipe = parseRecipeFromHtml(html, url);
  if (!recipe)
    return {
      ok: false as const,
      error: "Couldn't find a recipe on that page. Try a direct recipe link.",
    };
  return { ok: true as const, recipe };
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const parsedRecipeSchema = z.object({
  title: z.string().min(1).max(140),
  imageUrl: z.string().url().max(1000).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  ingredients: z.array(z.string().max(300)).max(80).default([]),
  steps: z.array(z.string().max(2000)).max(80).default([]),
  calories: z.coerce.number().int().min(0).max(20000).default(0),
  protein_g: z.coerce.number().int().min(0).max(2000).default(0),
  carbs_g: z.coerce.number().int().min(0).max(2000).default(0),
  fat_g: z.coerce.number().int().min(0).max(2000).default(0),
  servings: z.coerce.number().int().min(1).max(100).default(1),
  prepMinutes: z.coerce.number().int().min(0).max(6000).default(0),
  sourceUrl: z.string().url().max(1000),
});

/**
 * Save a link-imported recipe as the member's own recipe (image, ingredients
 * and steps preserved) and add it to a day/meal. The recipe then also shows in
 * their library and can be re-added with any servings.
 */
export async function importRecipeToMeal(input: {
  date: string;
  meal: string;
  servings?: number;
  recipe: z.input<typeof parsedRecipeSchema>;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      meal: mealEnum,
      servings: z.coerce.number().min(0.25).max(20).default(1),
      recipe: parsedRecipeSchema,
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const d = parsed.data;
  const r = d.recipe;

  // Per-serving macros: nutrition in structured data is for the whole recipe,
  // so divide by the recipe's own yield before we scale to the member's serving.
  const perServing = {
    calories: Math.round(r.calories / r.servings),
    protein_g: Math.round(r.protein_g / r.servings),
    carbs_g: Math.round(r.carbs_g / r.servings),
    fat_g: Math.round(r.fat_g / r.servings),
  };

  const rand = Math.random().toString(36).slice(2, 8);
  const slug = `${slugify(r.title).slice(0, 60) || "recipe"}-${rand}`;

  const { data: saved, error: recipeErr } = await supabase
    .from("recipes")
    .insert({
      slug,
      title: r.title,
      category: "Imported",
      image_url: r.imageUrl ?? null,
      description: r.description ?? null,
      ...perServing,
      servings: 1, // stored macros are already per single serving
      prep_minutes: r.prepMinutes || 15,
      tags: ["imported"],
      ingredients: r.ingredients,
      steps: r.steps,
      source: "user_import",
      source_url: r.sourceUrl,
      owner_id: user.id,
    })
    .select("id, title, calories, protein_g, carbs_g, fat_g")
    .single();
  if (recipeErr || !saved)
    return { ok: false as const, error: recipeErr?.message ?? "Could not save recipe" };

  const m = scaleMacros(saved, d.servings);
  const { error: entryErr } = await supabase.from("meal_entries").insert({
    user_id: user.id,
    entry_date: d.date,
    meal: d.meal,
    recipe_id: saved.id,
    title: saved.title,
    servings: d.servings,
    ...m,
  });
  if (entryErr) return { ok: false as const, error: entryErr.message };

  revalidatePath("/nutrition");
  revalidatePath("/nutrition/recipes");
  return { ok: true as const };
}

/** Toggle a recipe in the member's favourites. */
export async function toggleRecipeFavorite(recipeId: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z.string().uuid().safeParse(recipeId);
  if (!parsed.success) return { ok: false as const, error: "Invalid" };

  const { data: existing } = await supabase
    .from("recipe_favorites")
    .select("recipe_id")
    .eq("user_id", user.id)
    .eq("recipe_id", parsed.data)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("recipe_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("recipe_id", parsed.data);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase
      .from("recipe_favorites")
      .insert({ user_id: user.id, recipe_id: parsed.data });
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath("/nutrition");
  revalidatePath("/nutrition/recipes");
  return { ok: true as const, favorited: !existing };
}

export async function deleteMealEntry(id: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const { error } = await supabase
    .from("meal_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/nutrition");
  return { ok: true as const };
}

export interface ScannedProduct {
  code: string;
  name: string;
  brand: string | null;
  per100: { kcal: number; protein: number; carbs: number; fat: number };
  servingG: number | null;
  hasMacros: boolean;
}

/**
 * Look up a scanned barcode against Open Food Facts (free, no key). Returns
 * normalised per-100g macros so the client can scale to any quantity.
 */
export async function lookupBarcode(
  code: string
): Promise<
  | { ok: true; product: ScannedProduct }
  | { ok: false; error: "not_found" | "invalid" | "failed" }
> {
  const barcode = (code || "").replace(/\D/g, "");
  if (barcode.length < 6 || barcode.length > 14) return { ok: false, error: "invalid" };

  try {
    const url =
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json` +
      `?fields=product_name,brands,nutriments,serving_quantity`;
    const res = await fetch(url, {
      headers: { "User-Agent": "StellioFit/1.0 (hello@stellio.com.au)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return { ok: false, error: "failed" };
    const data = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        brands?: string;
        serving_quantity?: number | string;
        nutriments?: Record<string, number | string>;
      };
    };
    if (data.status !== 1 || !data.product) return { ok: false, error: "not_found" };

    const p = data.product;
    const n = p.nutriments ?? {};
    const num = (v: unknown) => {
      const x = typeof v === "number" ? v : Number(v);
      return Number.isFinite(x) ? x : 0;
    };
    let kcal = num(n["energy-kcal_100g"]);
    if (!kcal && n["energy_100g"]) kcal = num(n["energy_100g"]) / 4.184; // kJ → kcal
    const per100 = {
      kcal: Math.round(kcal),
      protein: Math.round(num(n["proteins_100g"])),
      carbs: Math.round(num(n["carbohydrates_100g"])),
      fat: Math.round(num(n["fat_100g"])),
    };
    const servingRaw = num(p.serving_quantity);
    return {
      ok: true,
      product: {
        code: barcode,
        name: (p.product_name || "").trim() || "Scanned product",
        brand: (p.brands || "").split(",")[0]?.trim() || null,
        per100,
        servingG: servingRaw > 0 ? servingRaw : null,
        hasMacros:
          per100.kcal > 0 || per100.protein > 0 || per100.carbs > 0 || per100.fat > 0,
      },
    };
  } catch {
    return { ok: false, error: "failed" };
  }
}
