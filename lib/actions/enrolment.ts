"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Enrol in a program. If the user already has an active/paused enrolment,
 * `switchMode` decides what happens to it:
 *  - "immediate": pause the current program and start the new one now
 *  - "pause_only": save current as paused, new one starts pending
 * Historical records are never deleted.
 */
export async function enrolInProgram(input: {
  programId: string;
  daysPerWeek?: number;
  switchMode?: "immediate" | "pause_only";
}) {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = z
    .object({
      programId: z.string().uuid(),
      daysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
      switchMode: z.enum(["immediate", "pause_only"]).default("immediate"),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { data: program } = await supabase
    .from("programs")
    .select("id, minimum_days_per_week, maximum_days_per_week, version, status")
    .eq("id", parsed.data.programId)
    .maybeSingle();
  if (!program || program.status !== "published")
    return { ok: false, error: "Program not available" };

  const days = Math.min(
    Math.max(
      parsed.data.daysPerWeek ?? program.minimum_days_per_week,
      program.minimum_days_per_week
    ),
    program.maximum_days_per_week
  );

  // Find any existing active/paused enrolment.
  const { data: existing } = await supabase
    .from("program_enrolments")
    .select("id, program_id, status")
    .in("status", ["active", "paused"])
    .eq("user_id", user.id)
    .maybeSingle();

  // Re-enrolling in the same program just re-activates it.
  if (existing && existing.program_id === parsed.data.programId) {
    await supabase
      .from("program_enrolments")
      .update({ status: "active", paused_at: null })
      .eq("id", existing.id);
    revalidatePath("/dashboard");
    return { ok: true, reactivated: true };
  }

  let previousId: string | null = null;
  if (existing) {
    previousId = existing.id;
    // Pause the outgoing program (keeps all its history).
    await supabase
      .from("program_enrolments")
      .update({ status: "paused", paused_at: new Date().toISOString() })
      .eq("id", existing.id);
  }

  const { error } = await supabase.from("program_enrolments").insert({
    user_id: user.id,
    program_id: parsed.data.programId,
    program_version: program.version,
    selected_days_per_week: days,
    status: parsed.data.switchMode === "pause_only" && existing ? "pending" : "active",
    previous_enrolment_id: previousId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/programs");
  return { ok: true };
}

export async function pauseEnrolment(enrolmentId: string) {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase
    .from("program_enrolments")
    .update({ status: "paused", paused_at: new Date().toISOString() })
    .eq("id", enrolmentId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function resumeEnrolment(enrolmentId: string) {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Only one active/paused enrolment can exist; pause any other first.
  await supabase
    .from("program_enrolments")
    .update({ status: "paused", paused_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "active")
    .neq("id", enrolmentId);

  const { error } = await supabase
    .from("program_enrolments")
    .update({ status: "active", paused_at: null })
    .eq("id", enrolmentId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function restartEnrolment(enrolmentId: string) {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase
    .from("program_enrolments")
    .update({
      status: "active",
      current_week: 1,
      next_workout_sequence: 1,
      paused_at: null,
      start_date: new Date().toISOString().slice(0, 10),
    })
    .eq("id", enrolmentId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleSavedProgram(programId: string) {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("saved_programs")
    .select("id")
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_programs").delete().eq("id", existing.id);
    revalidatePath("/programs");
    return { ok: true, saved: false };
  }
  const { error } = await supabase
    .from("saved_programs")
    .insert({ user_id: user.id, program_id: programId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/programs");
  return { ok: true, saved: true };
}
