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

/**
 * Enable a catalog metric for the current user (idempotent).
 *
 * Uses select-then-insert/update rather than upsert: the (user_id, metric_id)
 * uniqueness is a *partial* index (metric_id may be null for custom trackers),
 * which Postgres cannot use as an ON CONFLICT arbiter.
 */
export async function enableTracker(metricId: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (!z.string().uuid().safeParse(metricId).success)
    return { ok: false, error: "Invalid metric" };

  const { data: existing } = await supabase
    .from("user_health_metrics")
    .select("id")
    .eq("user_id", user.id)
    .eq("metric_id", metricId)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("user_health_metrics")
        .update({ enabled: true })
        .eq("id", existing.id)
    : await supabase
        .from("user_health_metrics")
        .insert({ user_id: user.id, metric_id: metricId, enabled: true });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/health");
  return { ok: true };
}

/** Disable/remove a tracker (catalog or custom). Keeps historical logs. */
export async function disableTracker(userHealthMetricId: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase
    .from("user_health_metrics")
    .update({ enabled: false })
    .eq("id", userHealthMetricId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/health");
  return { ok: true };
}

export async function addCustomTracker(input: {
  name: string;
  inputType: "scale" | "number" | "boolean";
  unit?: string;
  scaleMax?: number;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };
  const parsed = z
    .object({
      name: z.string().min(1).max(60),
      inputType: z.enum(["scale", "number", "boolean"]),
      unit: z.string().max(20).optional(),
      scaleMax: z.coerce.number().int().min(1).max(100).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;

  const { error } = await supabase.from("user_health_metrics").insert({
    user_id: user.id,
    custom_name: d.name,
    custom_input_type: d.inputType,
    custom_scale_min: d.inputType === "scale" ? 0 : null,
    custom_scale_max: d.inputType === "scale" ? (d.scaleMax ?? 10) : null,
    custom_unit: d.unit ?? null,
    enabled: true,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/health");
  return { ok: true };
}

/** Log (or overwrite) a value for a tracker on a given day. */
export async function logHealthValue(input: {
  userHealthMetricId: string;
  loggedOn?: string;
  value?: number | null;
  bool?: boolean | null;
  notes?: string;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };
  const parsed = z
    .object({
      userHealthMetricId: z.string().uuid(),
      loggedOn: z.string().optional(),
      value: z.coerce.number().finite().nullish(),
      bool: z.boolean().nullish(),
      notes: z.string().max(500).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;

  const { error } = await supabase.from("health_logs").upsert(
    {
      user_id: user.id,
      user_health_metric_id: d.userHealthMetricId,
      logged_on: d.loggedOn ?? new Date().toISOString().slice(0, 10),
      value_numeric: d.value ?? null,
      value_bool: d.bool ?? null,
      notes: d.notes ?? null,
    },
    { onConflict: "user_health_metric_id,logged_on" }
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/health");
  return { ok: true };
}
