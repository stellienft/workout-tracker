import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  loadWorkoutTemplate,
  loadCustomSplitDay,
  loadWorkoutFromSnapshot,
  type LoadedVideo,
  type AltOption,
  type SnapshotSlot,
} from "@/lib/workout-loader";
import {
  WorkoutMode,
  type WorkoutExerciseVM,
} from "@/components/workout/workout-mode";

// Full-screen workout mode lives outside the normal app chrome.
export const metadata = { title: "Workout" };

// ExerciseDB tags calisthenics with the "body weight" equipment token. Such
// exercises are loaded/lifted against the member's own bodyweight, so we log
// them as reps (with optional added weight) rather than a mandatory kg entry.
function isBodyweight(equipment: string[] | null | undefined): boolean {
  return (equipment ?? []).some((e) => e.toLowerCase().includes("body weight"));
}

// Common shape across the three exercise sources (live template, frozen
// snapshot, custom split day) — just the fields the workout screen needs.
interface VMSource {
  id: string | null;
  exercise_id: string;
  exercise: {
    name: string;
    tracking_type?: string | null;
    equipment?: string[] | null;
    primary_muscles: string[];
    instructions: string | null;
    technique_cues: string[];
    shoulder_safe: boolean;
    shoulder_notes: string | null;
    cover_image_path: string | null;
  };
  sets: number;
  rep_target: string | null;
  rep_min?: number | null;
  rep_max?: number | null;
  rest_seconds: number;
  notes: string | null;
  is_optional?: boolean;
  superset_group: number | null;
  video: LoadedVideo | null;
  alternatives: AltOption[];
  moreAlternatives: AltOption[];
  previous: WorkoutExerciseVM["previous"];
}

function mapToVM(ex: VMSource): WorkoutExerciseVM {
  return {
    templateExerciseId: ex.id,
    exerciseId: ex.exercise_id,
    name: ex.exercise.name,
    trackingType: ex.exercise.tracking_type === "time" ? "time" : "reps",
    isBodyweight: isBodyweight(ex.exercise.equipment),
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
    isOptional: ex.is_optional ?? false,
    supersetGroup: ex.superset_group ?? null,
    video: ex.video,
    alternatives: ex.alternatives,
    moreAlternatives: ex.moreAlternatives,
    previous: ex.previous,
  };
}

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
    const snap = session.exercise_snapshot as
      | { exercises?: SnapshotSlot[] }
      | null;
    const templateName =
      (session.template as unknown as { name: string } | null)?.name ?? "";
    if (snap?.exercises?.length) {
      // Frozen at start — immune to later edits of the shared template.
      const exs = await loadWorkoutFromSnapshot(snap.exercises, user.id);
      workoutName = templateName;
      vmExercises = exs.map(mapToVM);
    } else {
      // Older session (no snapshot): read the live template as before.
      const loaded = await loadWorkoutTemplate(session.workout_template_id, user.id);
      if (!loaded) notFound();
      workoutName = templateName || loaded.template.name;
      vmExercises = loaded.exercises.map(mapToVM);
    }
  } else if (session.custom_split_day_id) {
    const loaded = await loadCustomSplitDay(session.custom_split_day_id, user.id);
    if (!loaded) notFound();
    workoutName = loaded.day.name;
    programName = loaded.day.split_name;
    // Custom-split rows have no template_exercise_id FK.
    vmExercises = loaded.exercises.map((ex) => mapToVM({ ...ex, id: null }));
  } else {
    notFound();
  }

  // Existing set logs so a resumed session restores its state, plus the
  // member's injury/considerations note to surface during the workout.
  const [{ data: existingLogs }, { data: profile }, { data: weightRow }] =
    await Promise.all([
      supabase
        .from("set_logs")
        .select("*")
        .eq("session_id", sessionId)
        .order("set_number"),
      supabase
        .from("profiles")
        .select("considerations, injury_areas")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("body_metrics")
        .select("weight_kg")
        .eq("user_id", user.id)
        .not("weight_kg", "is", null)
        .order("recorded_on", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  return (
    <WorkoutMode
      sessionId={sessionId}
      initialSeconds={
        session.total_seconds ??
        Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000))
      }
      programName={programName}
      workoutName={workoutName}
      considerations={profile?.considerations ?? null}
      injuryAreas={(profile?.injury_areas as string[] | null) ?? null}
      bodyweightKg={(weightRow?.weight_kg as number | null) ?? null}
      initialWarmup={{
        type: (session.warmup_type as string | null) ?? null,
        seconds: (session.warmup_seconds as number | null) ?? null,
      }}
      exercises={vmExercises}
      initialLogs={(existingLogs ?? []).map((l) => ({
        exerciseId: l.exercise_id,
        setNumber: l.set_number,
        weightKg: l.weight_kg,
        reps: l.reps,
        durationSeconds: l.duration_seconds,
        rpe: l.rpe,
        painLevel: l.pain_level,
        completed: l.completed,
      }))}
    />
  );
}
