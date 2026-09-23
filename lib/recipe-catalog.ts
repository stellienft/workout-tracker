import catalog from "@/lib/recipe-catalog.json";
import type { MealSlot } from "@/lib/nutrition";

/**
 * The Ares recipe catalog — a single source of truth for real, original
 * recipes. It seeds the recipe library (via a migration generated from this
 * same data) AND composes the meal plans, so a plan's meals always match a
 * real recipe with identical macros.
 */
export interface CatalogRecipe {
  slug: string;
  title: string;
  category: string;
  slot: MealSlot;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  servings: number;
  prep_minutes: number;
  tags: string[];
  description: string;
  ingredients: string[];
  steps: string[];
}

export const RECIPE_CATALOG = catalog as CatalogRecipe[];

export const recipeBySlug: Record<string, CatalogRecipe> = Object.fromEntries(
  RECIPE_CATALOG.map((r) => [r.slug, r])
);
