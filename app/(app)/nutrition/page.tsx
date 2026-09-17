import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireUser, getAuthContext } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { planAllows } from "@/lib/plan";
import { UpgradeWall } from "@/components/billing/upgrade-wall";
import { getPrimaryGoal } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { NutritionDashboard } from "@/components/nutrition/nutrition-dashboard";
import { suggestTargets } from "@/lib/nutrition";

export const metadata = { title: "Nutrition" };

/** Today's date (YYYY-MM-DD) in the member's own timezone, so the food diary's
 * day boundary matches their local midnight rather than UTC. */
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

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { user } = await requireUser();
  const { plan } = await getUserPlan();
  if (!planAllows(plan, "nutrition")) return <UpgradeWall feature="nutrition" />;
  await getAuthContext();
  const sp = await searchParams;

  const supabase = await createClient();

  // Resolve the member's timezone first so "today" (and any meals they log)
  // land on their local calendar day, not the UTC day.
  const { data: profile } = await supabase
    .from("profiles")
    .select("weekly_frequency, age, timezone")
    .eq("id", user.id)
    .maybeSingle();
  const today = localToday(profile?.timezone as string | null | undefined);
  const date =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;

  const [
    { data: targetsRow },
    { data: entries },
    { data: recipes },
    { data: weightRow },
    primaryGoal,
    { data: favs },
    { data: scanRow },
  ] = await Promise.all([
    supabase.from("nutrition_targets").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("meal_entries")
      .select("id, meal, title, calories, protein_g, carbs_g, fat_g, servings, recipe_id")
      .eq("user_id", user.id)
      .eq("entry_date", date)
      .order("created_at", { ascending: true }),
    supabase
      .from("recipes")
      .select("id, slug, title, category, image_url, calories, protein_g, carbs_g, fat_g, prep_minutes")
      .order("title"),
    supabase
      .from("body_metrics")
      .select("weight_kg")
      .eq("user_id", user.id)
      .not("weight_kg", "is", null)
      .order("recorded_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getPrimaryGoal(user.id),
    supabase.from("recipe_favorites").select("recipe_id").eq("user_id", user.id),
    supabase
      .from("body_composition_scans")
      .select("scan_date, weight_kg, lean_mass_kg, muscle_mass_kg, body_fat_pct")
      .eq("user_id", user.id)
      .order("scan_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const favoriteIds = (favs ?? []).map((f) => f.recipe_id as string);

  // Feed the guided setup: prefer a real lean-mass reading, falling back to
  // muscle mass when a scan only reports that.
  const setupScan = scanRow
    ? {
        scan_date: (scanRow.scan_date as string) ?? null,
        weight_kg: scanRow.weight_kg != null ? Number(scanRow.weight_kg) : null,
        lean_mass_kg:
          scanRow.lean_mass_kg != null
            ? Number(scanRow.lean_mass_kg)
            : scanRow.muscle_mass_kg != null
              ? Number(scanRow.muscle_mass_kg)
              : null,
        body_fat_pct: scanRow.body_fat_pct != null ? Number(scanRow.body_fat_pct) : null,
      }
    : null;
  const setupProfile = {
    age: (profile?.age as number | null) ?? null,
    weightKg: weightRow?.weight_kg != null ? Number(weightRow.weight_kg) : null,
  };

  const suggested = suggestTargets({
    weightKg: weightRow?.weight_kg ?? null,
    goalName: primaryGoal?.name ?? null,
    weeklyFrequency: profile?.weekly_frequency ?? null,
  });

  const targets = targetsRow
    ? {
        calories: targetsRow.calories as number,
        protein_g: targetsRow.protein_g as number,
        carbs_g: targetsRow.carbs_g as number,
        fat_g: targetsRow.fat_g as number,
      }
    : suggested;

  return (
    <PageShell>
      <PageHeader
        title="Nutrition"
        subtitle="Track your macros and plan your meals."
        action={
          <Link
            href="/nutrition/recipes"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
          >
            <BookOpen className="h-4 w-4" /> Recipes
          </Link>
        }
      />
      <div className="mt-6">
        <NutritionDashboard
          date={date}
          today={today}
          targets={targets}
          suggested={suggested}
          hasSavedTargets={Boolean(targetsRow)}
          favoriteIds={favoriteIds}
          setupScan={setupScan}
          setupProfile={setupProfile}
          entries={(entries ?? []).map((e) => ({
            id: e.id as string,
            meal: e.meal as string,
            title: e.title as string,
            calories: e.calories as number,
            protein_g: e.protein_g as number,
            carbs_g: e.carbs_g as number,
            fat_g: e.fat_g as number,
            servings: Number(e.servings),
          }))}
          recipes={(recipes ?? []).map((r) => ({
            id: r.id as string,
            title: r.title as string,
            category: r.category as string,
            image_url: (r.image_url as string) ?? null,
            calories: r.calories as number,
            protein_g: r.protein_g as number,
            carbs_g: r.carbs_g as number,
            fat_g: r.fat_g as number,
            prep_minutes: r.prep_minutes as number,
          }))}
        />
      </div>
    </PageShell>
  );
}
