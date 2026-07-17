import { createClient } from "@/lib/supabase/server";
import { getActiveEnrolment, getProgramTemplates } from "@/lib/queries";
import {
  nextWorkout,
  weeklyProgress,
  completedThisWeek,
  type EngineTemplate,
  type EngineSession,
  type SchedulingMode,
} from "@/lib/engine";
import type { Program, ProgramEnrolment, WorkoutTemplate } from "@/lib/types";

export interface DashboardData {
  enrolment: (ProgramEnrolment & { program: Program }) | null;
  templates: WorkoutTemplate[];
  next: WorkoutTemplate | null;
  inProgressSession: {
    id: string;
    workout_template_id: string | null;
    started_at: string;
  } | null;
  weekly: ReturnType<typeof weeklyProgress>;
  completedTemplateIdsThisWeek: string[];
}

function toEngineTemplate(t: WorkoutTemplate): EngineTemplate {
  return {
    id: t.id,
    name: t.name,
    sequence_order: t.sequence_order,
    week_position: t.week_position,
    day_of_week: t.day_of_week,
    is_optional: t.is_optional,
  };
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const enrolment = await getActiveEnrolment(userId);

  if (!enrolment) {
    return {
      enrolment: null,
      templates: [],
      next: null,
      inProgressSession: null,
      weekly: { target: 0, completed: 0, remaining: 0, percent: 0 },
      completedTemplateIdsThisWeek: [],
    };
  }

  const templates = await getProgramTemplates(enrolment.program_id);

  const { data: sessionRows } = await supabase
    .from("workout_sessions")
    .select("id, workout_template_id, status, completed_at, week_number, started_at")
    .eq("user_id", userId)
    .eq("program_id", enrolment.program_id)
    .order("started_at", { ascending: false })
    .limit(60);

  const sessions = (sessionRows ?? []) as (EngineSession & {
    id: string;
    started_at: string;
  })[];

  const mode = enrolment.program.scheduling_mode as SchedulingMode;
  const now = new Date();

  const next = nextWorkout(
    mode,
    templates.map(toEngineTemplate),
    {
      current_week: enrolment.current_week,
      next_workout_sequence: enrolment.next_workout_sequence,
      selected_days_per_week: enrolment.selected_days_per_week,
      start_date: enrolment.start_date,
    },
    sessions,
    now
  );

  const nextTemplate = next
    ? (templates.find((t) => t.id === next.id) ?? null)
    : null;

  const inProgress = sessions.find((s) => s.status === "in_progress") ?? null;

  const weekly = weeklyProgress(
    mode,
    templates.map(toEngineTemplate),
    {
      current_week: enrolment.current_week,
      next_workout_sequence: enrolment.next_workout_sequence,
      selected_days_per_week: enrolment.selected_days_per_week,
      start_date: enrolment.start_date,
    },
    sessions,
    now
  );

  const completedTemplateIdsThisWeek = completedThisWeek(sessions, now)
    .map((s) => s.workout_template_id)
    .filter(Boolean) as string[];

  return {
    enrolment,
    templates,
    next: nextTemplate,
    inProgressSession: inProgress
      ? {
          id: inProgress.id,
          workout_template_id: inProgress.workout_template_id,
          started_at: inProgress.started_at,
        }
      : null,
    weekly,
    completedTemplateIdsThisWeek,
  };
}
