"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  completedThisWeek,
  advanceAfterCompletion,
  weeklyTargetFor,
  type EngineTemplate,
  type EngineSession,
  type SchedulingMode,
} from "@/lib/engine";

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Start (or resume) a workout session for a template. If an in-progress
 * session already exists for this template, return it so refreshes and
 * multiple entry points converge on one session.
 */
export async function startWorkout(input: {
  workoutTemplateId: string;
  preShoulderPain?: number | null;
  preEnergy?: number | null;
  preReadiness?: number | null;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = z
    .object({
      workoutTemplateId: z.string().uuid(),
      preShoulderPain: z.number().int().min(0).max(10).nullish(),
      preEnergy: z.number().int().min(1).max(5).nullish(),
      preReadiness: z.number().int().min(1).max(5).nullish(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const { data: template } = await supabase
    .from("workout_templates")
    .select("id, program_id")
    .eq("id", parsed.data.workoutTemplateId)
    .maybeSingle();
  if (!template) return { ok: false as const, error: "Workout not found" };

  // Resume an existing in-progress session for this template if present.
  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("workout_template_id", template.id)
    .eq("status", "in_progress")
    .maybeSingle();
  if (existing) return { ok: true as const, sessionId: existing.id };

  const { data: enrolment } = await supabase
    .from("program_enrolments")
    .select("id, current_week")
    .eq("user_id", user.id)
    .eq("program_id", template.program_id)
    .in("status", ["active", "paused"])
    .maybeSingle();

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      enrolment_id: enrolment?.id ?? null,
      program_id: template.program_id,
      workout_template_id: template.id,
      week_number: enrolment?.current_week ?? null,
      status: "in_progress",
      pre_shoulder_pain: parsed.data.preShoulderPain ?? null,
      pre_energy: parsed.data.preEnergy ?? null,
      pre_readiness: parsed.data.preReadiness ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true as const, sessionId: session.id };
}

const setLogSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  templateExerciseId: z.string().uuid().nullish(),
  substitutedFromExerciseId: z.string().uuid().nullish(),
  setNumber: z.number().int().min(1),
  weightKg: z.number().min(0).max(1000).nullish(),
  reps: z.number().int().min(0).max(1000).nullish(),
  rpe: z.number().min(1).max(10).nullish(),
  durationSeconds: z.number().int().min(0).nullish(),
  distanceM: z.number().min(0).nullish(),
  painLevel: z.number().int().min(0).max(10).nullish(),
  completed: z.boolean().default(true),
});

/** Upsert a single set log (idempotent on session+exercise+set_number). */
export async function logSet(input: z.input<typeof setLogSchema>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = setLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const d = parsed.data;

  const { error } = await supabase.from("set_logs").upsert(
    {
      session_id: d.sessionId,
      user_id: user.id,
      exercise_id: d.exerciseId,
      template_exercise_id: d.templateExerciseId ?? null,
      substituted_from_exercise_id: d.substitutedFromExerciseId ?? null,
      set_number: d.setNumber,
      weight_kg: d.weightKg ?? null,
      reps: d.reps ?? null,
      rpe: d.rpe ?? null,
      duration_seconds: d.durationSeconds ?? null,
      distance_m: d.distanceM ?? null,
      pain_level: d.painLevel ?? null,
      completed: d.completed,
    },
    { onConflict: "session_id,exercise_id,set_number" }
  );
  if (error) return { ok: false as const, error: error.message };

  // Surface an elevated-pain flag on the session for safety alerts.
  if (d.painLevel != null && d.painLevel >= 3) {
    await supabase
      .from("workout_sessions")
      .update({ discomfort_reported: true })
      .eq("id", d.sessionId)
      .eq("user_id", user.id);
    if (d.painLevel >= 5) {
      await supabase.from("pain_reports").insert({
        user_id: user.id,
        session_id: d.sessionId,
        exercise_id: d.exerciseId,
        severity: d.painLevel,
        notes: "Reported during a working set.",
      });
    }
  }

  return { ok: true as const };
}

/** Delete a single logged set (session + exercise + set number). */
export async function deleteSetLog(input: {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z
    .object({
      sessionId: z.string().uuid(),
      exerciseId: z.string().uuid(),
      setNumber: z.number().int().min(1),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const { error } = await supabase
    .from("set_logs")
    .delete()
    .eq("session_id", parsed.data.sessionId)
    .eq("user_id", user.id)
    .eq("exercise_id", parsed.data.exerciseId)
    .eq("set_number", parsed.data.setNumber);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/** Remove an exercise from a session: delete all of its logged sets. */
export async function deleteExerciseSets(input: {
  sessionId: string;
  exerciseId: string;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z
    .object({ sessionId: z.string().uuid(), exerciseId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const { error } = await supabase
    .from("set_logs")
    .delete()
    .eq("session_id", parsed.data.sessionId)
    .eq("user_id", user.id)
    .eq("exercise_id", parsed.data.exerciseId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function reportDiscomfort(input: {
  sessionId: string;
  exerciseId?: string | null;
  severity: number;
  bodyArea?: string;
  notes?: string;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z
    .object({
      sessionId: z.string().uuid(),
      exerciseId: z.string().uuid().nullish(),
      severity: z.number().int().min(0).max(10),
      bodyArea: z.string().default("left_shoulder"),
      notes: z.string().max(500).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  await supabase.from("pain_reports").insert({
    user_id: user.id,
    session_id: parsed.data.sessionId,
    exercise_id: parsed.data.exerciseId ?? null,
    body_area: parsed.data.bodyArea,
    severity: parsed.data.severity,
    notes: parsed.data.notes ?? null,
  });
  await supabase
    .from("workout_sessions")
    .update({ discomfort_reported: true })
    .eq("id", parsed.data.sessionId)
    .eq("user_id", user.id);
  return { ok: true as const };
}

export async function saveAndExit(sessionId: string, totalSeconds: number) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  await supabase
    .from("workout_sessions")
    .update({ total_seconds: totalSeconds })
    .eq("id", sessionId)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/**
 * Complete a workout: mark the session done and advance the enrolment's
 * program state via the engine (sequential pointer + weekly progression).
 */
export async function completeWorkout(input: {
  sessionId: string;
  totalSeconds: number;
  notes?: string;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = z
    .object({
      sessionId: z.string().uuid(),
      totalSeconds: z.number().int().min(0),
      notes: z.string().max(1000).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, program_id, workout_template_id, enrolment_id, status")
    .eq("id", parsed.data.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) return { ok: false as const, error: "Session not found" };
  if (session.status === "completed")
    return { ok: true as const, alreadyComplete: true };

  const completedAt = new Date().toISOString();
  await supabase
    .from("workout_sessions")
    .update({
      status: "completed",
      completed_at: completedAt,
      total_seconds: parsed.data.totalSeconds,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", session.id)
    .eq("user_id", user.id);

  // Advance program state.
  if (session.enrolment_id && session.program_id && session.workout_template_id) {
    const [{ data: enrolment }, { data: program }, { data: templates }] =
      await Promise.all([
        supabase
          .from("program_enrolments")
          .select("*")
          .eq("id", session.enrolment_id)
          .maybeSingle(),
        supabase
          .from("programs")
          .select("scheduling_mode, duration_weeks")
          .eq("id", session.program_id)
          .maybeSingle(),
        supabase
          .from("workout_templates")
          .select("id, name, sequence_order, week_position, day_of_week, is_optional")
          .eq("program_id", session.program_id),
      ]);

    if (enrolment && program && templates) {
      const mode = program.scheduling_mode as SchedulingMode;
      const engineTemplates = templates as EngineTemplate[];

      const { data: sessionRows } = await supabase
        .from("workout_sessions")
        .select("workout_template_id, status, completed_at, week_number")
        .eq("user_id", user.id)
        .eq("program_id", session.program_id);

      const sessions = (sessionRows ?? []) as EngineSession[];
      const doneThisWeek = completedThisWeek(sessions, new Date()).length;

      const next = advanceAfterCompletion(
        mode,
        engineTemplates,
        {
          current_week: enrolment.current_week,
          next_workout_sequence: enrolment.next_workout_sequence,
          selected_days_per_week: enrolment.selected_days_per_week,
          start_date: enrolment.start_date,
        },
        session.workout_template_id,
        doneThisWeek,
        program.duration_weeks
      );

      // Detect program completion: final week target met.
      const target = weeklyTargetFor(mode, engineTemplates, {
        selected_days_per_week: enrolment.selected_days_per_week,
      });
      const finishedProgram =
        next.current_week >= program.duration_weeks &&
        enrolment.current_week >= program.duration_weeks &&
        doneThisWeek >= target &&
        target > 0;

      await supabase
        .from("program_enrolments")
        .update({
          next_workout_sequence: next.next_workout_sequence,
          current_week: next.current_week,
          ...(finishedProgram
            ? { status: "completed", completed_at: completedAt }
            : {}),
        })
        .eq("id", enrolment.id);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  revalidatePath("/progress");
  return { ok: true as const };
}

/** Swap an exercise within a live session (records substitution on logs). */
export async function replaceExercise() {
  // Substitution is captured on each set log via substituted_from_exercise_id;
  // the live UI performs the swap client-side, so no server state is needed
  // beyond what logSet records. Kept for API symmetry / future persistence.
  return { ok: true as const };
}
