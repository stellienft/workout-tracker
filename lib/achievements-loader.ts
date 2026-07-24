import type { createClient } from "@/lib/supabase/server";
import {
  computeAchievements,
  type Achievement,
  type AchSession,
  type AchSet,
  type AchExerciseMeta,
  type BodyPoint,
} from "@/lib/achievements";

type Supa = Awaited<ReturnType<typeof createClient>>;

/** Load the member's history and compute their current achievements. */
export async function loadAchievements(
  supabase: Supa,
  userId: string
): Promise<Achievement[]> {
  const [{ data: sessions }, { data: logs }, { data: metrics }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("started_at, completed_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .limit(1000),
    supabase
      .from("set_logs")
      .select("exercise_id, weight_kg, reps, distance_m, duration_seconds, completed, created_at")
      .eq("user_id", userId)
      .eq("completed", true)
      .limit(20000),
    supabase
      .from("body_metrics")
      .select("recorded_on, weight_kg")
      .eq("user_id", userId)
      .not("weight_kg", "is", null)
      .order("recorded_on", { ascending: true })
      .limit(2000),
  ]);

  const achSessions: AchSession[] = (sessions ?? []).map((s) => ({
    startedAt: s.started_at as string,
    completedAt: (s.completed_at as string | null) ?? null,
  }));

  const achSets: AchSet[] = (logs ?? []).map((l) => ({
    exerciseId: l.exercise_id as string,
    weightKg: (l.weight_kg as number | null) ?? null,
    reps: (l.reps as number | null) ?? null,
    distanceM: (l.distance_m as number | null) ?? null,
    durationSeconds: (l.duration_seconds as number | null) ?? null,
    completed: true,
    at: l.created_at as string,
  }));

  const exerciseIds = Array.from(new Set(achSets.map((s) => s.exerciseId)));
  const metaById = new Map<string, AchExerciseMeta>();
  if (exerciseIds.length) {
    const { data: exRows } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", exerciseIds);
    for (const e of exRows ?? []) {
      metaById.set(e.id as string, { id: e.id as string, name: e.name as string });
    }
  }

  const body: BodyPoint[] = (metrics ?? []).map((m) => ({
    date: m.recorded_on as string,
    weightKg: Number(m.weight_kg),
  }));

  return computeAchievements(achSessions, achSets, metaById, body);
}
