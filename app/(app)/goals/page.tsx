import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { GoalGrid } from "@/components/goal-grid";
import type { FitnessGoal } from "@/lib/types";

export const metadata = { title: "Goals" };

export default async function GoalsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const [{ data: goals }, { data: primary }] = await Promise.all([
    supabase.from("fitness_goals").select("*").eq("active", true).order("display_order"),
    supabase
      .from("user_goals")
      .select("fitness_goal_id")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .maybeSingle(),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Goals"
        subtitle="Your primary goal shapes your recommendations. Change it any time."
      />
      <div className="mt-6">
        <GoalGrid
          goals={(goals ?? []) as FitnessGoal[]}
          primaryId={primary?.fitness_goal_id ?? null}
        />
      </div>
    </PageShell>
  );
}
