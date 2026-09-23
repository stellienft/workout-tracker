import { requireUser } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { planAllows } from "@/lib/plan";
import { UpgradeWall } from "@/components/billing/upgrade-wall";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { MealPlansClient } from "@/components/nutrition/meal-plans-client";
import { MEAL_PLANS, mealKeyword } from "@/lib/meal-plans";

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
    supabase.from("recipes").select("id, title").order("title"),
  ]);
  const today = localToday(profile?.timezone as string | null | undefined);
  const targetCalories = (targetsRow?.calories as number | null) ?? null;

  // Match each plan meal to a real recipe by its main food, so "Find recipes"
  // can open an exact recipe rather than a search when there's a good match.
  const recipeList = (recipes ?? []).map((r) => ({
    id: r.id as string,
    title: (r.title as string).toLowerCase(),
  }));
  const recipeMatches: Record<string, string> = {};
  for (const plan of MEAL_PLANS) {
    for (const m of plan.meals) {
      if (recipeMatches[m.title]) continue;
      const kw = mealKeyword(m.title);
      if (!kw) continue;
      const hit = recipeList.find((r) => r.title.includes(kw));
      if (hit) recipeMatches[m.title] = hit.id;
    }
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
