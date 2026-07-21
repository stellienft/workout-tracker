"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createSplit(input: { name: string; description?: string }) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z
    .object({
      name: z.string().min(2, "Give your split a name").max(120),
      description: z.string().max(500).optional(),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { data, error } = await supabase
    .from("custom_splits")
    .insert({
      owner_user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/splits");
  return { ok: true as const, id: data.id };
}

export async function deleteSplit(splitId: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const { error } = await supabase
    .from("custom_splits")
    .delete()
    .eq("id", splitId)
    .eq("owner_user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/splits");
  return { ok: true as const };
}

const daySchema = z.object({
  splitId: z.string().uuid(),
  name: z.string().min(1, "Name the day").max(120),
  focusMuscles: z.array(z.string().max(40)).max(12).default([]),
  notes: z.string().max(500).optional(),
});

export async function addSplitDay(input: z.input<typeof daySchema>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = daySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  // Next day number for this split (RLS scopes to the owner).
  const { data: last } = await supabase
    .from("custom_split_days")
    .select("day_number")
    .eq("split_id", d.splitId)
    .order("day_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const dayNumber = (last?.day_number ?? 0) + 1;

  const { data, error } = await supabase
    .from("custom_split_days")
    .insert({
      split_id: d.splitId,
      day_number: dayNumber,
      name: d.name,
      focus_muscles: d.focusMuscles,
      notes: d.notes || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/splits/${d.splitId}`);
  return { ok: true as const, id: data.id };
}

export async function updateSplitDay(input: {
  dayId: string;
  splitId: string;
  name?: string;
  focusMuscles?: string[];
  notes?: string;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.focusMuscles !== undefined) update.focus_muscles = input.focusMuscles;
  if (input.notes !== undefined) update.notes = input.notes || null;

  const { error } = await supabase
    .from("custom_split_days")
    .update(update)
    .eq("id", input.dayId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/splits/${input.splitId}`);
  return { ok: true as const };
}

export async function deleteSplitDay(dayId: string, splitId: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const { error } = await supabase
    .from("custom_split_days")
    .delete()
    .eq("id", dayId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/splits/${splitId}`);
  return { ok: true as const };
}

const dayExerciseSchema = z.object({
  splitId: z.string().uuid(),
  dayId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  sets: z.coerce.number().int().min(1).max(10).default(3),
  repTarget: z.string().max(40).optional(),
  restSeconds: z.coerce.number().int().min(0).max(600).default(90),
});

export async function addExerciseToSplitDay(input: z.input<typeof dayExerciseSchema>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = dayExerciseSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const { data: last } = await supabase
    .from("custom_split_day_exercises")
    .select("position")
    .eq("split_day_id", d.dayId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("custom_split_day_exercises").insert({
    split_day_id: d.dayId,
    exercise_id: d.exerciseId,
    position: (last?.position ?? 0) + 1,
    sets: d.sets,
    rep_target: d.repTarget || null,
    rest_seconds: d.restSeconds,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/splits/${d.splitId}`);
  return { ok: true as const };
}

export async function removeSplitDayExercise(rowId: string, splitId: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const { error } = await supabase
    .from("custom_split_day_exercises")
    .delete()
    .eq("id", rowId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/splits/${splitId}`);
  return { ok: true as const };
}

/** Start (or resume) a workout session for a custom split day. */
export async function startSplitWorkout(dayId: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z.string().uuid().safeParse(dayId);
  if (!parsed.success) return { ok: false as const, error: "Invalid day" };

  // The day must have at least one exercise to train.
  const { count } = await supabase
    .from("custom_split_day_exercises")
    .select("id", { count: "exact", head: true })
    .eq("split_day_id", parsed.data);
  if (!count) return { ok: false as const, error: "Add exercises to this day first." };

  // Resume an in-progress session for this day if one exists.
  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("custom_split_day_id", parsed.data)
    .eq("status", "in_progress")
    .maybeSingle();
  if (existing) return { ok: true as const, sessionId: existing.id };

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      custom_split_day_id: parsed.data,
      status: "in_progress",
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true as const, sessionId: session.id };
}
