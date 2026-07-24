import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RecipeImport } from "@/components/admin/recipe-import";

export const metadata = { title: "Recipes · Admin" };

export default async function AdminRecipesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { count: total } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true });

  return (
    <div>
      <h1 className="text-2xl font-bold">Recipes</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {total ?? 0} recipes in the library · sourced from TheMealDB.
      </p>

      <div className="mt-6">
        <RecipeImport />
      </div>
    </div>
  );
}
