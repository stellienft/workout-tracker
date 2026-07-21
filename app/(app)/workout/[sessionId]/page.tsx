import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadWorkoutTemplate, loadCustomSplitDay } from "@/lib/workout-loader";
import {
  WorkoutMode,
  type WorkoutExerciseVM,
} from "@/components/workout/workout-mode";

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

  let vmExercises: WorkoutExerciseVM[] = [];
  let workoutName = "";
  let programName =
    (session.program as unknown as { name: string } | null)?.name ?? "";

  if (session.workout_template_id) {
    const loaded = await loadWorkoutTemplate(session.workout_template_id, user.id);
    if (!loaded) notFound();
    workoutName =
      (session.template as unknown as { name: string } | null)?.name ??
      loaded.template.name;
    vmExercises = loaded.exercises.map((ex) => ({
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
    }));
  } else if (session.custom_split_day_id) {
    const loaded = await loadCustomSplitDay(session.custom_split_day_id, user.id);
    if (!loaded) notFound();
    workoutName = loaded.day.name;
    programName = loaded.day.split_name;
    vmExercises = loaded.exercises.map((ex) => ({
      // Not a workout_template_exercises row, so no template_exercise_id FK.
      templateExerciseId: null,
      exerciseId: ex.exercise_id,
      name: ex.exercise.name,
      primaryMuscles: ex.exercise.primary_muscles,
      instructions: ex.exercise.instructions,
      techniqueCues: ex.exercise.technique_cues,
      shoulderSafe: ex.exercise.shoulder_safe,
      shoulderNotes: ex.exercise.shoulder_notes,
      coverPath: ex.exercise.cover_image_path,
      sets: ex.sets,
      repTarget: ex.rep_target ?? "",
      restSeconds: ex.rest_seconds,
      notes: ex.notes,
      isOptional: false,
      video: ex.video,
      alternatives: ex.alternatives,
      moreAlternatives: ex.moreAlternatives,
      previous: ex.previous,
    }));
  } else {
    notFound();
  }

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
      programName={programName}
      workoutName={workoutName}
      preShoulderPain={session.pre_shoulder_pain}
      considerations={profile?.considerations ?? null}
      exercises={vmExercises}
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
