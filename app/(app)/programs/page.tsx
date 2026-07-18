import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { ProgramLibrary } from "@/components/program-library";
import type { Program, FitnessGoal } from "@/lib/types";

export const metadata = { title: "Programs" };

export default async function ProgramsPage() {
  await requireUser();
  const supabase = await createClient();

  const [{ data: programs }, { data: goals }] = await Promise.all([
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
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Programs"
        subtitle="Browse plans built for every goal and experience level."
      />
      <div className="mt-6">
        <ProgramLibrary
          programs={(programs ?? []) as Program[]}
          goals={(goals ?? []) as FitnessGoal[]}
        />
      </div>
    </PageShell>
  );
}
