import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { ExerciseLibrary } from "@/components/exercise-library";
import type { Exercise } from "@/lib/types";

export const metadata = { title: "Exercise library" };

export default async function ExercisesPage() {
  const { user } = await requireUser();
  const supabase = await createClient();
  const [{ data }, { data: favs }] = await Promise.all([
    supabase
      .from("exercises")
      .select("*")
      .eq("status", "published")
      .order("name"),
    supabase
      .from("exercise_favorites")
      .select("exercise_id")
      .eq("user_id", user.id),
  ]);
  const favoriteIds = (favs ?? []).map((f) => f.exercise_id as string);

  return (
    <PageShell>
      <PageHeader
        title="Exercise library"
        subtitle="Every movement, with technique guidance and shoulder-safe flags."
      />
      <div className="mt-6">
        <ExerciseLibrary
          exercises={(data ?? []) as Exercise[]}
          favoriteIds={favoriteIds}
        />
      </div>
    </PageShell>
  );
}
