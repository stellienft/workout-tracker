import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CoverImage } from "@/components/ui/cover-image";
import { ProgramCard } from "@/components/program-card";
import type { FitnessGoal, Program } from "@/lib/types";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: goal } = await supabase
    .from("fitness_goals")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!goal) notFound();
  const g = goal as FitnessGoal;

  const [{ data: programs }, { data: saved }] = await Promise.all([
    supabase
      .from("programs")
      .select("*")
      .eq("fitness_goal_id", g.id)
      .eq("status", "published")
      .order("featured", { ascending: false }),
    supabase.from("saved_programs").select("program_id").eq("user_id", user.id),
  ]);
  const savedIds = new Set((saved ?? []).map((s) => s.program_id as string));

  return (
    <div className="pb-12">
      <div className="relative h-56 w-full sm:h-72">
        <CoverImage path={g.cover_image_path} alt={g.name} sizes="100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background-primary)] via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-5xl px-4 pb-6 sm:px-6">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{g.name}</h1>
          <p className="mt-1 max-w-2xl text-[var(--text-secondary)]">
            {g.short_description}
          </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <p className="mt-5 max-w-2xl text-[var(--text-secondary)]">
          {g.long_description}
        </p>
        <h2 className="mt-8 text-lg font-bold">Recommended programs</h2>
        {programs && programs.length > 0 ? (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(programs as Program[]).map((p) => (
              <ProgramCard
                key={p.id}
                program={p}
                goalName={g.name}
                saved={savedIds.has(p.id)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[var(--text-secondary)]">
            Programs for this goal are being expanded — check back soon.
          </p>
        )}
      </div>
    </div>
  );
}
