import { requireUser, getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryGoal } from "@/lib/queries";
import { recommendProgramsForOnboarding } from "@/lib/actions/onboarding";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { ProgramLibrary } from "@/components/program-library";
import { ProgramCard } from "@/components/program-card";
import { isGlp1 } from "@/lib/glp1";
import type { Program, FitnessGoal } from "@/lib/types";

const GLP1_SLUGS = ["glp1-foundations", "glp1-recomp", "glp1-preserve"];
const LEVEL_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

export const metadata = { title: "Programs" };

export default async function ProgramsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const [
    { data: programs },
    { data: goals },
    { data: saved },
    { profile },
    primaryGoal,
    { data: medLogs },
  ] = await Promise.all([
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
    supabase
      .from("medication_logs")
      .select("medication_name")
      .eq("user_id", user.id)
      .limit(50),
  ]);

  const savedIds = (saved ?? []).map((s) => s.program_id as string);
  const allPrograms = (programs ?? []) as Program[];
  const goalName = Object.fromEntries((goals ?? []).map((g) => [g.id, g.name]));

  // GLP-1 members (flagged at onboarding, or logging a GLP-1 med) get a
  // dedicated row of the muscle-preservation programs, best level first.
  const isGlp1User =
    profile?.glp1_medication === true ||
    (medLogs ?? []).some((m) => isGlp1(m.medication_name as string | null));
  const userLevel = LEVEL_ORDER[profile?.experience_level ?? ""] ?? 0;
  const glp1Programs = isGlp1User
    ? allPrograms
        .filter((p) => GLP1_SLUGS.includes(p.slug))
        .sort(
          (a, b) =>
            Math.abs((LEVEL_ORDER[a.experience_level] ?? 0) - userLevel) -
            Math.abs((LEVEL_ORDER[b.experience_level] ?? 0) - userLevel)
        )
    : [];

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
    // Don't repeat GLP-1 programs here — they get their own row above.
    .filter((p) => !(isGlp1User && GLP1_SLUGS.includes(p.slug)))
    .slice(0, 3);

  return (
    <PageShell>
      <PageHeader
        title="Programs"
        subtitle="Browse plans built for every goal and experience level."
      />

      {glp1Programs.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold">For your GLP-1 journey</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Built to preserve muscle while you lose weight. Because you&apos;re
            tracking a GLP-1 medication.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {glp1Programs.map((p) => (
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
