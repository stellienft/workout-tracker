import { requireUser } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { planAllows } from "@/lib/plan";
import { UpgradeWall } from "@/components/billing/upgrade-wall";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { MealPlansClient } from "@/components/nutrition/meal-plans-client";
import { RECIPE_CATALOG } from "@/lib/recipe-catalog";

export const metadata = { title: "Meal plans" };

function localToday(timezone: string | null | undefined) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default async function MealPlansPage() {
  const { user } = await requireUser();
  const { plan } = await getUserPlan();
  if (!planAllows(plan, "nutrition")) return <UpgradeWall feature="nutrition" />;

  const supabase = await createClient();
  const [{ data: profile }, { data: targetsRow }, { data: recipes }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    supabase.from("nutrition_targets").select("calories").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("recipes")
      .select("id, slug")
      .in("slug", RECIPE_CATALOG.map((r) => r.slug)),
  ]);
  const today = localToday(profile?.timezone as string | null | undefined);
  const targetCalories = (targetsRow?.calories as number | null) ?? null;

  // Every plan meal is a catalog recipe, so link straight to it by slug.
  const recipeMatches: Record<string, string> = {};
  for (const r of recipes ?? []) {
    recipeMatches[r.slug as string] = r.id as string;
  }

  return (
    <PageShell>
      <PageHeader
        title="Meal plans"
        subtitle="Full days of eating for every goal — add one to your diary in a tap, then tweak to taste."
      />
      <MealPlansClient
        today={today}
        targetCalories={targetCalories}
        recipeMatches={recipeMatches}
      />
    </PageShell>
  );
}
