import { createClient } from "@/lib/supabase/server";
import { GoalRow } from "@/components/admin/goal-row";
import type { FitnessGoal } from "@/lib/types";

export default async function AdminGoalsPage() {
  const supabase = await createClient();
  const { data: goals } = await supabase
    .from("fitness_goals")
    .select("*")
    .order("display_order");

  return (
    <div>
      <h1 className="text-2xl font-bold">Goals</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        Toggle availability and edit copy. Inactive goals are hidden from onboarding.
      </p>
      <div className="mt-6 space-y-2">
        {(goals as FitnessGoal[] | null)?.map((g) => (
          <GoalRow key={g.id} goal={g} />
        ))}
      </div>
    </div>
  );
}
