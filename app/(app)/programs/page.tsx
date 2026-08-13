import { requireUser, getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryGoal } from "@/lib/queries";
import { recommendProgramsForOnboarding } from "@/lib/actions/onboarding";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { ProgramLibrary } from "@/components/program-library";
import { ProgramCard } from "@/components/program-card";
import type { Program, FitnessGoal } from "@/lib/types";

export const metadata = { title: "Programs" };

export default async function ProgramsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const [{ data: programs }, { data: goals }, { data: saved }, { profile }, primaryGoal] =
    await Promise.all([
      supabase
        .from("programs")
        .select("*")
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("name"),
      supabase
        .from("fitness_goals")
        .select("*")
        .eq("active", true)
        .order("display_order"),
      supabase.from("saved_programs").select("program_id").eq("user_id", user.id),
      getAuthContext(),
      getPrimaryGoal(user.id),
    ]);

  const savedIds = (saved ?? []).map((s) => s.program_id as string);
  const allPrograms = (programs ?? []) as Program[];
  const goalName = Object.fromEntries((goals ?? []).map((g) => [g.id, g.name]));

  // "Recommended for you" — same matching used in onboarding, for members who
  // set a goal/level (i.e. finished onboarding). Resolve to full Program rows so
  // the cards render identically to the library below.
  const recs = primaryGoal
    ? await recommendProgramsForOnboarding({
        goalId: primaryGoal.id,
        experience:
          (profile?.experience_level as "beginner" | "intermediate" | "advanced") ??
          undefined,
        location:
          (profile?.training_location as "home" | "gym" | "both" | null) ?? undefined,
      })
    : [];
  const byId = new Map(allPrograms.map((p) => [p.id, p]));
  const recommended = recs
    .map((r) => byId.get(r.id))
    .filter((p): p is Program => !!p)
    .slice(0, 3);

  return (
    <PageShell>
      <PageHeader
        title="Programs"
        subtitle="Browse plans built for every goal and experience level."
      />

      {recommended.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold">Recommended for you</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Matched to your goal, fitness level and where you train.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((p) => (
              <ProgramCard
                key={p.id}
                program={p}
                goalName={p.fitness_goal_id ? goalName[p.fitness_goal_id] : undefined}
                saved={savedIds.includes(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        {recommended.length > 0 && (
          <h2 className="mb-3 text-lg font-bold">All programs</h2>
        )}
        <ProgramLibrary
          programs={allPrograms}
          goals={(goals ?? []) as FitnessGoal[]}
          savedIds={savedIds}
        />
      </div>
    </PageShell>
  );
}
