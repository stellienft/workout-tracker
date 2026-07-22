import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui/page-header";
import { RecipeLibrary } from "@/components/nutrition/recipe-library";

export const metadata = { title: "Recipes" };

export default async function RecipesPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const [{ data: recipes }, { data: favs }] = await Promise.all([
    supabase
      .from("recipes")
      .select(
        "id, title, category, image_url, description, calories, protein_g, carbs_g, fat_g, servings, prep_minutes, tags, ingredients, steps"
      )
      .order("title"),
    supabase.from("recipe_favorites").select("recipe_id").eq("user_id", user.id),
  ]);
  const favoriteIds = (favs ?? []).map((f) => f.recipe_id as string);

  return (
    <PageShell>
      <Link
        href="/nutrition"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Nutrition
      </Link>
      <RecipeLibrary
        favoriteIds={favoriteIds}
        recipes={(recipes ?? []).map((r) => ({
          id: r.id as string,
          title: r.title as string,
          category: r.category as string,
          image_url: (r.image_url as string) ?? null,
          description: (r.description as string) ?? null,
          calories: r.calories as number,
          protein_g: r.protein_g as number,
          carbs_g: r.carbs_g as number,
          fat_g: r.fat_g as number,
          servings: r.servings as number,
          prep_minutes: r.prep_minutes as number,
          tags: (r.tags as string[]) ?? [],
          ingredients: (r.ingredients as string[]) ?? [],
          steps: (r.steps as string[]) ?? [],
        }))}
      />
    </PageShell>
  );
}
