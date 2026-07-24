/**
 * TheMealDB client. Free, no signup — the shared test key "1" works, and
 * THEMEALDB_API_KEY can override it with a Patreon key later. Chosen for its
 * consistent, high-quality food photography. It does NOT provide nutrition, so
 * imported recipes carry no macros (calories/protein/etc. stay 0).
 */

import type { NormalizedRecipe } from "@/lib/spoonacular";

function base() {
  const key = process.env.THEMEALDB_API_KEY || "1";
  return `https://www.themealdb.com/api/json/v1/${key}`;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// TheMealDB meal shape (only the fields we use; ingredients are numbered 1..20).
interface Meal {
  idMeal: string;
  strMeal: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strMealThumb?: string;
  strTags?: string | null;
  [key: string]: string | null | undefined;
}

function ingredientsOf(m: Meal): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (m[`strIngredient${i}`] ?? "").toString().trim();
    const measure = (m[`strMeasure${i}`] ?? "").toString().trim();
    if (!name) continue;
    out.push(measure ? `${measure} ${name}` : name);
  }
  return out;
}

function stepsOf(m: Meal): string[] {
  const raw = (m.strInstructions ?? "").replace(/\r/g, "");
  const byLine = raw
    .split(/\n+/)
    .map((s) => s.replace(/^\s*(STEP\s*\d+[:.)]?)\s*/i, "").trim())
    .filter((s) => s.length > 0);
  if (byLine.length > 1) return byLine.slice(0, 25);
  // Single blob: split into sentences.
  return raw
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25);
}

function normalize(m: Meal): NormalizedRecipe {
  const category = m.strCategory || "Miscellaneous";
  const area = m.strArea || "";
  const tags = [
    ...(m.strTags ? m.strTags.split(",").map((t) => t.trim()) : []),
    area,
    category,
  ].filter((t, i, a) => t && a.indexOf(t) === i);

  const instructions = (m.strInstructions ?? "").replace(/\r/g, "").trim();
  const description = instructions
    ? instructions.split(/\n|(?<=\.)\s+/)[0].slice(0, 200)
    : `${area} ${category}`.trim();

  return {
    externalId: `themealdb:${m.idMeal}`,
    slug: `${slugify(m.strMeal)}-tmdb${m.idMeal}`,
    title: m.strMeal,
    category,
    imageUrl: m.strMealThumb ?? null,
    description,
    // TheMealDB has no nutrition data.
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    servings: 1,
    prepMinutes: 0,
    tags: tags.slice(0, 8),
    ingredients: ingredientsOf(m),
    steps: stepsOf(m),
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TheMealDB error ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}`);
  }
  return (await res.json()) as T;
}

async function lookup(id: string): Promise<NormalizedRecipe | null> {
  const data = await fetchJson<{ meals: Meal[] | null }>(`${base()}/lookup.php?i=${id}`);
  const meal = data.meals?.[0];
  return meal ? normalize(meal) : null;
}

/** Full recipes for a TheMealDB category (Beef, Chicken, Seafood, …). */
export async function listByCategory(
  category: string,
  number = 8
): Promise<NormalizedRecipe[]> {
  const list = await fetchJson<{ meals: { idMeal: string }[] | null }>(
    `${base()}/filter.php?c=${encodeURIComponent(category)}`
  );
  const ids = (list.meals ?? []).slice(0, Math.max(1, number)).map((m) => m.idMeal);

  const out: NormalizedRecipe[] = [];
  const CONCURRENCY = 5;
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const chunk = ids.slice(i, i + CONCURRENCY);
    const recipes = await Promise.all(chunk.map((id) => lookup(id).catch(() => null)));
    out.push(...recipes.filter((r): r is NormalizedRecipe => r !== null));
  }
  return out;
}

/** Search TheMealDB by name; returns fully-detailed recipes. */
export async function searchTheMealDb(opts: {
  query: string;
  number?: number;
}): Promise<NormalizedRecipe[]> {
  const data = await fetchJson<{ meals: Meal[] | null }>(
    `${base()}/search.php?s=${encodeURIComponent(opts.query || "")}`
  );
  return (data.meals ?? []).slice(0, opts.number ?? 15).map(normalize);
}
