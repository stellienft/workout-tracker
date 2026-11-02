"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const num = z
  .union([z.number(), z.string()])
  .transform((v) => (v === "" || v == null ? null : Number(v)))
  .refine((v) => v == null || (!Number.isNaN(v) && v >= 0 && v < 10000), {
    message: "Invalid value",
  })
  .nullable()
  .optional();

const schema = z.object({
  recordedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fastingGlucose: num,
  fastingInsulin: num,
  hba1c: num,
  triglycerides: num,
  hdl: num,
  waist: num,
  notes: z.string().max(500).optional(),
});

/** Add one lab-result entry (any subset of markers). */
export async function addMetabolicEntry(input: unknown) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const d = parsed.data;

  const row = {
    user_id: user.id,
    recorded_on: d.recordedOn,
    fasting_glucose_mmol: d.fastingGlucose ?? null,
    fasting_insulin_uu: d.fastingInsulin ?? null,
    hba1c_pct: d.hba1c ?? null,
    triglycerides_mmol: d.triglycerides ?? null,
    hdl_mmol: d.hdl ?? null,
    waist_cm: d.waist ?? null,
    notes: d.notes?.trim() || null,
  };

  // Require at least one marker so we don't store empty rows.
  const hasValue = [
    row.fasting_glucose_mmol,
    row.fasting_insulin_uu,
    row.hba1c_pct,
    row.triglycerides_mmol,
    row.hdl_mmol,
    row.waist_cm,
  ].some((v) => v != null);
  if (!hasValue) return { ok: false as const, error: "Enter at least one marker" };

  const { error } = await supabase.from("metabolic_markers").insert(row);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/metabolic");
  return { ok: true as const };
}

/** Delete one entry. */
export async function deleteMetabolicEntry(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  if (!z.string().uuid().safeParse(id).success)
    return { ok: false as const, error: "Invalid id" };

  const { error } = await supabase
    .from("metabolic_markers")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/metabolic");
  return { ok: true as const };
}

/** Save the member's height (cm) — used for waist-to-height. */
export async function setHeightCm(cm: number | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const valid = cm == null || (cm > 50 && cm < 260);
  if (!valid) return { ok: false as const, error: "Invalid height" };

  const { error } = await supabase
    .from("profiles")
    .update({ height_cm: cm })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/metabolic");
  return { ok: true as const };
}

/** Toggle the optional metabolic reminder nudges. */
export async function setMetabolicReminders(enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ metabolic_reminders_enabled: enabled })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/metabolic");
  return { ok: true as const };
}
