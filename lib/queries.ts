import { createClient } from "@/lib/supabase/server";
import type {
  Program,
  ProgramEnrolment,
  WorkoutTemplate,
  FitnessGoal,
} from "@/lib/types";

/** The user's current active enrolment with its program joined. A member can
 *  hold more than one in-progress program (see getInProgressPrograms), but only
 *  one is active at a time and drives the dashboard's "today's workout". */
export async function getActiveEnrolment(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("program_enrolments")
    .select("*, program:programs(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("enrolled_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as
    | (ProgramEnrolment & { program: Program })
    | null;
}

export interface InProgressProgram {
  enrolmentId: string;
  programId: string;
  name: string;
  slug: string;
  coverPath: string | null;
  week: number;
  status: string;
  isActive: boolean;
}

/** Every program the member currently holds (active + parked), active first, so
 *  the dashboard can offer a swipe-to-switch between them. */
export async function getInProgressPrograms(
  userId: string
): Promise<InProgressProgram[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("program_enrolments")
    .select("id, program_id, status, current_week, enrolled_at, program:programs(name, slug, cover_image_path)")
    .eq("user_id", userId)
    .in("status", ["active", "paused", "pending"])
    .order("enrolled_at", { ascending: false });

  const rows = (data ?? []) as unknown as {
    id: string;
    program_id: string;
    status: string;
    current_week: number;
    program: { name: string; slug: string; cover_image_path: string | null } | null;
  }[];

  return rows
    .map((r) => ({
      enrolmentId: r.id,
      programId: r.program_id,
      name: r.program?.name ?? "Program",
      slug: r.program?.slug ?? "",
      coverPath: r.program?.cover_image_path ?? null,
      week: r.current_week,
      status: r.status,
      isActive: r.status === "active",
    }))
    .sort((a, b) => Number(b.isActive) - Number(a.isActive));
}

export async function getProgramTemplates(
  programId: string
): Promise<WorkoutTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("program_id", programId)
    .order("sequence_order", { ascending: true, nullsFirst: false })
    .order("week_position", { ascending: true, nullsFirst: false })
    .order("name");
  return (data ?? []) as WorkoutTemplate[];
}

export async function getPrimaryGoal(
  userId: string
): Promise<FitnessGoal | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_goals")
    .select("fitness_goal:fitness_goals(*)")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();
  return (data?.fitness_goal as unknown as FitnessGoal) ?? null;
}

export async function getRecentSessions(userId: string, limit = 30) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export interface RecentWorkout {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  totalSeconds: number | null;
  name: string;
  setCount: number;
}

/**
 * Recent completed / in-progress workouts with their name and logged-set count,
 * for the dashboard list. Each is tappable through to its session so members
 * can review or edit past workouts.
 */
export async function getRecentWorkouts(
  userId: string,
  limit = 10,
): Promise<RecentWorkout[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_sessions")
    .select(
      "id, status, started_at, completed_at, total_seconds, template:workout_templates(name), split_day:custom_split_days(name)",
    )
    .eq("user_id", userId)
    .in("status", ["completed", "in_progress"])
    .order("started_at", { ascending: false })
    .limit(limit);

  const rows = data ?? [];
  const ids = rows.map((r) => r.id as string);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: logs } = await supabase
      .from("set_logs")
      .select("session_id")
      .in("session_id", ids)
      .eq("completed", true);
    for (const l of logs ?? [])
      counts.set(l.session_id as string, (counts.get(l.session_id as string) ?? 0) + 1);
  }

  return rows.map((r) => {
    const tpl = (Array.isArray(r.template) ? r.template[0] : r.template) as
      | { name: string }
      | null;
    const sd = (Array.isArray(r.split_day) ? r.split_day[0] : r.split_day) as
      | { name: string }
      | null;
    return {
      id: r.id as string,
      status: r.status as string,
      startedAt: r.started_at as string,
      completedAt: (r.completed_at as string | null) ?? null,
      totalSeconds: (r.total_seconds as number | null) ?? null,
      name: tpl?.name ?? sd?.name ?? "Workout",
      setCount: counts.get(r.id as string) ?? 0,
    };
  });
}
