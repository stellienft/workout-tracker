import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { ExerciseLibrary } from "@/components/exercise-library";
import type { Exercise } from "@/lib/types";

export const metadata = { title: "Exercise library" };

export default async function ExercisesPage() {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .eq("status", "published")
    .order("name");

  return (
    <PageShell>
      <PageHeader
        title="Exercise library"
        subtitle="Every movement, with technique guidance and shoulder-safe flags."
      />
      <div className="mt-6">
        <ExerciseLibrary exercises={(data ?? []) as Exercise[]} />
      </div>
    </PageShell>
  );
}
