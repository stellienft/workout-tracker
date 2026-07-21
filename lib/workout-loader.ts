import { createClient } from "@/lib/supabase/server";
import { normaliseVideoForClient } from "@/lib/video-utils";
import type {
  WorkoutTemplate,
  WorkoutTemplateExercise,
  Exercise,
  ExerciseVideo,
} from "@/lib/types";

export interface LoadedVideo {
  id: string;
  videoId: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  sourceUrl: string;
  title: string | null;
  creatorName: string | null;
  verificationStatus: string;
}

export interface AltOption {
  id: string;
  name: string;
  slug: string;
  shoulder_safe: boolean;
}

interface Enrichment {
  video: LoadedVideo | null;
  alternatives: AltOption[];
  moreAlternatives: AltOption[];
  previous: {
    set_number: number;
    weight_kg: number | null;
    reps: number | null;
    rpe: number | null;
  }[];
}

export interface LoadedExercise extends WorkoutTemplateExercise, Enrichment {
  exercise: Exercise;
}

export interface LoadedWorkout {
  template: WorkoutTemplate;
  exercises: LoadedExercise[];
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Shared enrichment for any list of exercises: preferred video, curated
 * alternatives, a broader same-muscle replacement pool, and the member's
 * previous performance per exercise.
 */
async function enrichExercises(
  supabase: ServerClient,
  exercises: Exercise[],
  userId: string
): Promise<Map<string, Enrichment>> {
  const exerciseIds = exercises.map((e) => e.id);
  const safeIds = exerciseIds.length
    ? exerciseIds
    : ["00000000-0000-0000-0000-000000000000"];

  const [{ data: videoRows }, { data: altRows }, { data: pool }] =
    await Promise.all([
      supabase
        .from("exercise_videos")
        .select("*")
        .in("exercise_id", safeIds)
        .eq("active", true),
      supabase
        .from("exercise_alternatives")
        .select(
          "exercise_id, priority, alternative:exercises!exercise_alternatives_alternative_exercise_id_fkey(id, name, slug, shoulder_safe)"
        )
        .in("exercise_id", safeIds)
        .order("priority"),
      supabase
        .from("exercises")
        .select("id, name, slug, shoulder_safe, primary_muscles")
        .eq("status", "published")
        .limit(500),
    ]);

  // Preferred video per exercise (verified > unverified > placeholder).
  const videoByExercise = new Map<string, ExerciseVideo>();
  for (const v of (videoRows ?? []) as ExerciseVideo[]) {
    const existing = videoByExercise.get(v.exercise_id);
    const rank = (x: ExerciseVideo) =>
      x.verification_status === "verified"
        ? 0
        : x.verification_status === "placeholder"
          ? 2
          : 1;
    if (!existing || rank(v) < rank(existing)) videoByExercise.set(v.exercise_id, v);
  }

  const altsByExercise = new Map<string, AltOption[]>();
  for (const r of altRows ?? []) {
    const alt = r.alternative as unknown as AltOption | null;
    if (!alt) continue;
    const list = altsByExercise.get(r.exercise_id as string) ?? [];
    list.push(alt);
    altsByExercise.set(r.exercise_id as string, list);
  }

  // Previous performance: the most recent session's set logs per exercise.
  const previousByExercise = new Map<string, Enrichment["previous"]>();
  if (exerciseIds.length) {
    const { data: prevLogs } = await supabase
      .from("set_logs")
      .select("exercise_id, set_number, weight_kg, reps, rpe, created_at, session_id")
      .eq("user_id", userId)
      .in("exercise_id", exerciseIds)
      .order("created_at", { ascending: false })
      .limit(200);
    const seenSession = new Map<string, string>();
    for (const log of prevLogs ?? []) {
      const exId = log.exercise_id as string;
      if (!seenSession.has(exId)) seenSession.set(exId, log.session_id as string);
      if (seenSession.get(exId) !== log.session_id) continue;
      const list = previousByExercise.get(exId) ?? [];
      list.push({
        set_number: log.set_number as number,
        weight_kg: log.weight_kg as number | null,
        reps: log.reps as number | null,
        rpe: log.rpe as number | null,
      });
      previousByExercise.set(exId, list);
    }
    for (const [, list] of previousByExercise)
      list.sort((a, b) => a.set_number - b.set_number);
  }

  // Broader replacement pool: published exercises sharing a primary muscle.
  const poolRows = (pool ?? []) as (AltOption & { primary_muscles: string[] })[];
  const musclesByExercise = new Map(
    exercises.map((e) => [e.id, e.primary_muscles ?? []])
  );

  const result = new Map<string, Enrichment>();
  for (const ex of exercises) {
    const muscles = new Set(musclesByExercise.get(ex.id) ?? []);
    const seeded = new Set((altsByExercise.get(ex.id) ?? []).map((a) => a.id));
    const more =
      muscles.size === 0
        ? []
        : poolRows
            .filter(
              (p) =>
                p.id !== ex.id &&
                !seeded.has(p.id) &&
                p.primary_muscles.some((m) => muscles.has(m))
            )
            .slice(0, 12)
            .map(({ id, name, slug, shoulder_safe }) => ({
              id,
              name,
              slug,
              shoulder_safe,
            }));
    result.set(ex.id, {
      video: normaliseVideoForClient(videoByExercise.get(ex.id) ?? null),
      alternatives: altsByExercise.get(ex.id) ?? [],
      moreAlternatives: more,
      previous: previousByExercise.get(ex.id) ?? [],
    });
  }
  return result;
}

export async function loadWorkoutTemplate(
  templateId: string,
  userId: string
): Promise<LoadedWorkout | null> {
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();
  if (!template) return null;

  const { data: rows } = await supabase
    .from("workout_template_exercises")
    .select("*, exercise:exercises(*)")
    .eq("workout_template_id", templateId)
    .order("position");

  const templateExercises = (rows ?? []) as (WorkoutTemplateExercise & {
    exercise: Exercise;
  })[];

  const enrichment = await enrichExercises(
    supabase,
    templateExercises.map((r) => r.exercise).filter(Boolean),
    userId
  );

  const empty: Enrichment = {
    video: null,
    alternatives: [],
    moreAlternatives: [],
    previous: [],
  };

  const exercises: LoadedExercise[] = templateExercises.map((te) => ({
    ...te,
    ...(enrichment.get(te.exercise_id) ?? empty),
  }));

  return { template: template as WorkoutTemplate, exercises };
}

// ============================================================
// Custom split days
// ============================================================

export interface LoadedSplitDayExercise extends Enrichment {
  id: string; // custom_split_day_exercises row id
  exercise_id: string;
  sets: number;
  rep_target: string | null;
  rest_seconds: number;
  notes: string | null;
  exercise: Exercise;
}

export interface LoadedSplitDay {
  day: {
    id: string;
    name: string;
    day_number: number;
    focus_muscles: string[];
    notes: string | null;
    split_id: string;
    split_name: string;
  };
  exercises: LoadedSplitDayExercise[];
}

export async function loadCustomSplitDay(
  dayId: string,
  userId: string
): Promise<LoadedSplitDay | null> {
  const supabase = await createClient();

  const { data: day } = await supabase
    .from("custom_split_days")
    .select("id, name, day_number, focus_muscles, notes, split_id, split:custom_splits(name)")
    .eq("id", dayId)
    .maybeSingle();
  if (!day) return null;

  const { data: rows } = await supabase
    .from("custom_split_day_exercises")
    .select("id, exercise_id, sets, rep_target, rest_seconds, notes, exercise:exercises(*)")
    .eq("split_day_id", dayId)
    .order("position");

  const items = (rows ?? []) as unknown as (Omit<
    LoadedSplitDayExercise,
    keyof Enrichment
  > & { exercise: Exercise })[];

  const enrichment = await enrichExercises(
    supabase,
    items.map((r) => r.exercise).filter(Boolean),
    userId
  );

  const empty: Enrichment = {
    video: null,
    alternatives: [],
    moreAlternatives: [],
    previous: [],
  };

  const split = day.split as unknown as { name: string } | { name: string }[] | null;
  const splitName = Array.isArray(split) ? (split[0]?.name ?? "") : (split?.name ?? "");

  return {
    day: {
      id: day.id,
      name: day.name,
      day_number: day.day_number,
      focus_muscles: day.focus_muscles ?? [],
      notes: day.notes,
      split_id: day.split_id,
      split_name: splitName,
    },
    exercises: items.map((r) => ({
      ...r,
      ...(enrichment.get(r.exercise_id) ?? empty),
    })),
  };
}
