import { createClient } from "@/lib/supabase/server";
import type {
  Program,
  ProgramEnrolment,
  WorkoutTemplate,
  FitnessGoal,
} from "@/lib/types";

/** The user's current active (or paused) enrolment with its program joined. */
export async function getActiveEnrolment(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("program_enrolments")
    .select("*, program:programs(*)")
    .eq("user_id", userId)
    .in("status", ["active", "paused"])
    .order("enrolled_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as
    | (ProgramEnrolment & { program: Program })
    | null;
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
