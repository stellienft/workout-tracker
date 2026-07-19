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

const num = z.coerce.number().optional().nullable();

export async function saveBodyMetrics(input: Record<string, unknown>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const schema = z.object({
    recordedOn: z.string().optional(),
    weightKg: num,
    chestCm: num,
    waistCm: num,
    hipsCm: num,
    leftArmCm: num,
    rightArmCm: num,
    leftThighCm: num,
    rightThighCm: num,
    notes: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;

  const { error } = await supabase.from("body_metrics").upsert(
    {
      user_id: user.id,
      recorded_on: d.recordedOn ?? new Date().toISOString().slice(0, 10),
      weight_kg: d.weightKg ?? null,
      chest_cm: d.chestCm ?? null,
      waist_cm: d.waistCm ?? null,
      hips_cm: d.hipsCm ?? null,
      left_arm_cm: d.leftArmCm ?? null,
      right_arm_cm: d.rightArmCm ?? null,
      left_thigh_cm: d.leftThighCm ?? null,
      right_thigh_cm: d.rightThighCm ?? null,
      notes: d.notes ?? null,
    },
    { onConflict: "user_id,recorded_on" }
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/progress");
  return { ok: true };
}

export async function saveCheckin(input: Record<string, unknown>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const scale = z.coerce.number().int().min(0).max(10).optional().nullable();
  const schema = z.object({
    checkinType: z.enum(["daily", "weekly"]).default("daily"),
    energy: scale,
    sleepQuality: scale,
    soreness: scale,
    mood: scale,
    shoulderPain: scale,
    recovery: scale,
    notes: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;

  const { error } = await supabase.from("checkins").upsert(
    {
      user_id: user.id,
      checked_on: new Date().toISOString().slice(0, 10),
      checkin_type: d.checkinType,
      energy: d.energy ?? null,
      sleep_quality: d.sleepQuality ?? null,
      soreness: d.soreness ?? null,
      mood: d.mood ?? null,
      shoulder_pain: d.shoulderPain ?? null,
      recovery: d.recovery ?? null,
      notes: d.notes ?? null,
    },
    { onConflict: "user_id,checked_on,checkin_type" }
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/check-ins");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveMedicationLog(input: Record<string, unknown>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const schema = z.object({
    medicationName: z.string().default("Mounjaro"),
    doseMg: z.coerce.number().min(0).max(100).optional().nullable(),
    takenOn: z.string().optional(),
    injectionSite: z.string().max(60).optional(),
    sideEffects: z.array(z.string()).default([]),
    sideEffectSeverity: z.coerce.number().int().min(0).max(5).optional().nullable(),
    notes: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;

  const { error } = await supabase.from("medication_logs").insert({
    user_id: user.id,
    medication_name: d.medicationName,
    dose_mg: d.doseMg ?? null,
    taken_on: d.takenOn ?? new Date().toISOString().slice(0, 10),
    injection_site: d.injectionSite ?? null,
    side_effects: d.sideEffects,
    side_effect_severity: d.sideEffectSeverity ?? null,
    notes: d.notes ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/health");
  return { ok: true };
}

export async function updateSettings(input: Record<string, unknown>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };
  const schema = z.object({
    fullName: z.string().max(120).optional(),
    unitPreference: z.enum(["metric", "imperial"]).optional(),
    hapticsEnabled: z.boolean().optional(),
    medicationTracking: z.boolean().optional(),
    considerations: z.string().max(1000).optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;

  const update: Record<string, unknown> = {};
  if (d.fullName !== undefined) update.full_name = d.fullName;
  if (d.unitPreference !== undefined) update.unit_preference = d.unitPreference;
  if (d.hapticsEnabled !== undefined) update.haptics_enabled = d.hapticsEnabled;
  if (d.medicationTracking !== undefined)
    update.medication_tracking_enabled = d.medicationTracking;
  if (d.considerations !== undefined) update.considerations = d.considerations;

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}
