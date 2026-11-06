import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { EditWorkout, type EditExercise } from "@/components/workout/edit-workout";

export const metadata = { title: "Edit workout" };

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, template:workout_templates(name)")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) notFound();

  const { data: logs } = await supabase
    .from("set_logs")
    .select(
      "exercise_id, set_number, weight_kg, reps, duration_seconds, exercise:exercises!exercise_id(name, equipment)",
    )
    .eq("session_id", sessionId)
    .order("set_number");

  // Group logged sets by exercise, preserving first-seen order.
  const byExercise = new Map<string, EditExercise>();
  for (const l of logs ?? []) {
    const ex = (Array.isArray(l.exercise) ? l.exercise[0] : l.exercise) as
      | { name: string; equipment: string[] | null }
      | undefined;
    const id = l.exercise_id as string;
    if (!byExercise.has(id)) {
      const equip = ex?.equipment ?? [];
      byExercise.set(id, {
        exerciseId: id,
        name: ex?.name ?? "Exercise",
        isBodyweight: equip.some((e) => String(e).toLowerCase().includes("body weight")),
        sets: [],
      });
    }
    byExercise.get(id)!.sets.push({
      setNumber: l.set_number as number,
      weightKg: (l.weight_kg as number | null) ?? null,
      reps: (l.reps as number | null) ?? null,
      durationSeconds: (l.duration_seconds as number | null) ?? null,
    });
  }

  const exercises = Array.from(byExercise.values());
  const workoutName =
    (session.template as unknown as { name: string } | null)?.name ?? "Workout";

  return (
    <PageShell>
      <PageHeader
        title="Edit workout"
        subtitle={`${workoutName} — fix any weights or reps. Changes save as you go.`}
      />
      <div className="mt-6">
        <EditWorkout
          sessionId={sessionId}
          exercises={exercises}
          returnHref={`/workout/${sessionId}/summary`}
        />
      </div>
    </PageShell>
  );
}
