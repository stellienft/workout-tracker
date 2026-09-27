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
