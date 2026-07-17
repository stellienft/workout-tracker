import { createClient } from "@/lib/supabase/server";
import { youtubeVideoId, youtubeEmbedUrl, youtubeThumbnailUrl } from "@/lib/utils";
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

export interface LoadedExercise extends WorkoutTemplateExercise {
  exercise: Exercise;
  video: LoadedVideo | null;
  alternatives: { id: string; name: string; slug: string; shoulder_safe: boolean }[];
  previous: {
    set_number: number;
    weight_kg: number | null;
    reps: number | null;
    rpe: number | null;
  }[];
}

export interface LoadedWorkout {
  template: WorkoutTemplate;
  exercises: LoadedExercise[];
}

function normaliseVideo(v: ExerciseVideo | null): LoadedVideo | null {
  if (!v) return null;
  const vid = v.provider_video_id ?? (v.source_url ? youtubeVideoId(v.source_url) : null);
  return {
    id: v.id,
    videoId: vid,
    embedUrl: v.embed_url ?? (vid ? youtubeEmbedUrl(vid) : null),
    thumbnailUrl: v.thumbnail_url ?? (vid ? youtubeThumbnailUrl(vid) : null),
    sourceUrl: v.source_url,
    title: v.title,
    creatorName: v.creator_name,
    verificationStatus: v.verification_status,
  };
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
  const exerciseIds = templateExercises.map((r) => r.exercise_id);

  // Videos for these exercises (prefer verified, then any active).
  const { data: videoRows } = await supabase
    .from("exercise_videos")
    .select("*")
    .in("exercise_id", exerciseIds.length ? exerciseIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("active", true);
  const videos = (videoRows ?? []) as ExerciseVideo[];
  const videoByExercise = new Map<string, ExerciseVideo>();
  for (const v of videos) {
    const existing = videoByExercise.get(v.exercise_id);
    const rank = (x: ExerciseVideo) =>
      x.verification_status === "verified" ? 0 : x.verification_status === "placeholder" ? 2 : 1;
    if (!existing || rank(v) < rank(existing)) videoByExercise.set(v.exercise_id, v);
  }

  // Alternatives.
  const { data: altRows } = await supabase
    .from("exercise_alternatives")
    .select("exercise_id, priority, alternative:exercises!exercise_alternatives_alternative_exercise_id_fkey(id, name, slug, shoulder_safe)")
    .in("exercise_id", exerciseIds.length ? exerciseIds : ["00000000-0000-0000-0000-000000000000"])
    .order("priority");
  const altsByExercise = new Map<
    string,
    { id: string; name: string; slug: string; shoulder_safe: boolean }[]
  >();
  for (const r of altRows ?? []) {
    const alt = r.alternative as unknown as {
      id: string;
      name: string;
      slug: string;
      shoulder_safe: boolean;
    };
    if (!alt) continue;
    const list = altsByExercise.get(r.exercise_id as string) ?? [];
    list.push(alt);
    altsByExercise.set(r.exercise_id as string, list);
  }

  // Previous performance: most recent completed session's set logs per exercise.
  const previousByExercise = new Map<
    string,
    { set_number: number; weight_kg: number | null; reps: number | null; rpe: number | null }[]
  >();
  if (exerciseIds.length) {
    const { data: prevLogs } = await supabase
      .from("set_logs")
      .select("exercise_id, set_number, weight_kg, reps, rpe, created_at, session_id")
      .eq("user_id", userId)
      .in("exercise_id", exerciseIds)
      .order("created_at", { ascending: false })
      .limit(200);
    // Group by exercise, keep the most recent session's sets.
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
    for (const [, list] of previousByExercise) list.sort((a, b) => a.set_number - b.set_number);
  }

  const exercises: LoadedExercise[] = templateExercises.map((te) => ({
    ...te,
    video: normaliseVideo(videoByExercise.get(te.exercise_id) ?? null),
    alternatives: altsByExercise.get(te.exercise_id) ?? [],
    previous: previousByExercise.get(te.exercise_id) ?? [],
  }));

  return { template: template as WorkoutTemplate, exercises };
}
