import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireUser, getAuthContext } from "@/lib/auth";
import { getPrimaryGoal } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { NutritionDashboard } from "@/components/nutrition/nutrition-dashboard";
import { suggestTargets } from "@/lib/nutrition";

export const metadata = { title: "Nutrition" };

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { user } = await requireUser();
  await getAuthContext();
  const sp = await searchParams;
  const date =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : isoDate(new Date());

  const supabase = await createClient();
  const [
    { data: targetsRow },
    { data: entries },
    { data: recipes },
    { data: weightRow },
    primaryGoal,
    { data: profile },
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
    supabase.from("profiles").select("weekly_frequency").eq("id", user.id).maybeSingle(),
  ]);

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
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
          >
            <BookOpen className="h-4 w-4" /> Browse recipes
          </Link>
        }
      />
      <div className="mt-6">
        <NutritionDashboard
          date={date}
          targets={targets}
          suggested={suggested}
          hasSavedTargets={Boolean(targetsRow)}
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
