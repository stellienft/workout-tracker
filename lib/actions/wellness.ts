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

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Add (or remove, if negative) water for the given local day; clamped ≥ 0. */
export async function addWater(input: { date: string; deltaMl: number }) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z
    .object({ date: dateSchema, deltaMl: z.coerce.number().int().min(-5000).max(5000) })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const { date, deltaMl } = parsed.data;

  const { data: existing } = await supabase
    .from("daily_wellness")
    .select("id, water_ml")
    .eq("user_id", user.id)
    .eq("logged_on", date)
    .maybeSingle();

  const next = Math.max(0, Math.min(20000, (Number(existing?.water_ml) || 0) + deltaMl));

  const { error } = await supabase.from("daily_wellness").upsert(
    { user_id: user.id, logged_on: date, water_ml: next, updated_at: new Date().toISOString() },
    { onConflict: "user_id,logged_on" }
  );
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true as const, waterMl: next };
}

/** Log last night's sleep for the given local day. */
export async function logSleep(input: { date: string; hours: number; quality?: number }) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z
    .object({
      date: dateSchema,
      hours: z.coerce.number().min(0).max(24),
      quality: z.coerce.number().int().min(1).max(5).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const { date, hours, quality } = parsed.data;

  const { error } = await supabase.from("daily_wellness").upsert(
    {
      user_id: user.id,
      logged_on: date,
      sleep_hours: hours,
      sleep_quality: quality ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,logged_on" }
  );
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true as const };
}
