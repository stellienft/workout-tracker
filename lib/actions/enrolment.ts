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

  const nowIso = new Date().toISOString();

  // Every program the member currently holds (active + parked), newest first.
  const { data: existingRows } = await supabase
    .from("program_enrolments")
    .select("id, program_id, status")
    .in("status", ["active", "paused", "pending"])
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });
  const existing = existingRows ?? [];

  // Already holding this program → just make it the active one (progress kept).
  const same = existing.find((e) => e.program_id === parsed.data.programId);
  if (same) {
    await supabase
      .from("program_enrolments")
      .update({ status: "paused", paused_at: nowIso })
      .eq("user_id", user.id)
      .eq("status", "active")
      .neq("id", same.id);
    await supabase
      .from("program_enrolments")
      .update({ status: "active", paused_at: null })
      .eq("id", same.id)
      .eq("user_id", user.id);
    revalidatePath("/dashboard");
    revalidatePath("/programs/current");
    return { ok: true, reactivated: true };
  }

  // Keep two programs at most: park the most-recent existing one and leave any
  // older ones behind. The new program becomes the active one, and switching
  // between the two (below) never loses either one's progress.
  const [keep, ...drop] = existing;
  if (drop.length) {
    await supabase
      .from("program_enrolments")
      .update({ status: "abandoned" })
      .in(
        "id",
        drop.map((d) => d.id)
      )
      .eq("user_id", user.id);
  }
  if (keep) {
    await supabase
      .from("program_enrolments")
      .update({ status: "paused", paused_at: nowIso })
      .eq("id", keep.id)
      .eq("user_id", user.id);
  }

  const { error } = await supabase.from("program_enrolments").insert({
    user_id: user.id,
    program_id: parsed.data.programId,
    program_version: program.version,
    selected_days_per_week: days,
    status: "active",
    previous_enrolment_id: keep?.id ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/programs");
  revalidatePath("/programs/current");
  return { ok: true };
}

/**
 * Make one of the member's held programs the active one, parking whichever was
 * active. Progress (week + next workout) is preserved on both — this is the
 * dashboard's swipe-to-switch between two concurrent programs.
 */
export async function switchActiveProgram(enrolmentId: string) {
  return resumeEnrolment(enrolmentId);
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

/** Cancel (leave) a program. Marks the enrolment abandoned; history is kept. */
export async function cancelEnrolment(enrolmentId: string) {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase
    .from("program_enrolments")
    .update({ status: "abandoned" })
    .eq("id", enrolmentId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/programs/current");
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
    revalidatePath("/programs/saved");
    return { ok: true, saved: false };
  }
  const { error } = await supabase
    .from("saved_programs")
    .insert({ user_id: user.id, program_id: programId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/programs");
  revalidatePath("/programs/saved");
  return { ok: true, saved: true };
}
