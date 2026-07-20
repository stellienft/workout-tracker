import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadWorkoutTemplate } from "@/lib/workout-loader";
import { WorkoutMode } from "@/components/workout/workout-mode";

// Full-screen workout mode lives outside the normal app chrome.
export const metadata = { title: "Workout" };

export default async function WorkoutSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*, template:workout_templates(name), program:programs(name)")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) notFound();
  if (session.status === "completed") redirect(`/workout/${sessionId}/summary`);
  if (!session.workout_template_id) notFound();

  const loaded = await loadWorkoutTemplate(session.workout_template_id, user.id);
  if (!loaded) notFound();

  // Existing set logs so a resumed session restores its state, plus the
  // member's injury/considerations note to surface during the workout.
  const [{ data: existingLogs }, { data: profile }] = await Promise.all([
    supabase
      .from("set_logs")
      .select("*")
      .eq("session_id", sessionId)
      .order("set_number"),
    supabase.from("profiles").select("considerations").eq("id", user.id).maybeSingle(),
  ]);

  return (
    <WorkoutMode
      sessionId={sessionId}
      startedAt={session.started_at}
      programName={
        (session.program as unknown as { name: string } | null)?.name ?? ""
      }
      workoutName={
        (session.template as unknown as { name: string } | null)?.name ??
        loaded.template.name
      }
      preShoulderPain={session.pre_shoulder_pain}
      considerations={profile?.considerations ?? null}
      exercises={loaded.exercises.map((ex) => ({
        templateExerciseId: ex.id,
        exerciseId: ex.exercise_id,
        name: ex.exercise.name,
        primaryMuscles: ex.exercise.primary_muscles,
        instructions: ex.exercise.instructions,
        techniqueCues: ex.exercise.technique_cues,
        shoulderSafe: ex.exercise.shoulder_safe,
        shoulderNotes: ex.exercise.shoulder_notes,
        coverPath: ex.exercise.cover_image_path,
        sets: ex.sets,
        repTarget:
          ex.rep_target ??
          (ex.rep_min && ex.rep_max
            ? `${ex.rep_min}–${ex.rep_max}`
            : ex.rep_min
              ? `${ex.rep_min}`
              : ""),
        restSeconds: ex.rest_seconds,
        notes: ex.notes,
        isOptional: ex.is_optional,
        video: ex.video,
        alternatives: ex.alternatives,
        moreAlternatives: ex.moreAlternatives,
        previous: ex.previous,
      }))}
      initialLogs={(existingLogs ?? []).map((l) => ({
        exerciseId: l.exercise_id,
        setNumber: l.set_number,
        weightKg: l.weight_kg,
        reps: l.reps,
        rpe: l.rpe,
        painLevel: l.pain_level,
        completed: l.completed,
      }))}
    />
  );
}
