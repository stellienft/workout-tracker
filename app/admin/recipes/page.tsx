import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RecipeImport } from "@/components/admin/recipe-import";

export const metadata = { title: "Recipes · Admin" };

export default async function AdminRecipesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ count: total }, { count: imported }] = await Promise.all([
    supabase.from("recipes").select("id", { count: "exact", head: true }),
    supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("source", "spoonacular"),
  ]);

  const hasKey = Boolean(process.env.SPOONACULAR_API_KEY);

  return (
    <div>
      <h1 className="text-2xl font-bold">Recipes</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {total ?? 0} recipes in the library · {imported ?? 0} imported from Spoonacular.
      </p>

      {!hasKey && (
        <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--warning)]/40 bg-[var(--surface-primary)] p-4 text-sm">
          <p className="font-medium">Spoonacular isn&apos;t configured yet</p>
          <p className="mt-1 text-[var(--text-secondary)]">
            Add a <code>SPOONACULAR_API_KEY</code> environment variable (Vercel →
            Project → Settings → Environment Variables, and your Stellio
            environment), then redeploy. Get a free key at spoonacular.com/food-api.
          </p>
        </div>
      )}

      <div className="mt-6">
        <RecipeImport disabled={!hasKey} />
      </div>
    </div>
  );
}
