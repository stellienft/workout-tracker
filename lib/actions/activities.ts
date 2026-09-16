"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  steps: z.coerce.number().int().min(0).max(200000),
  distanceM: z.coerce.number().min(0).max(200000).default(0),
  movingSeconds: z.coerce.number().int().min(0).max(86400).default(0),
  calories: z.coerce.number().min(0).max(20000).default(0),
});

/** Save a walking-pad session as an activity so it shows in Activities. */
export async function saveWalkingPadSession(input: z.input<typeof schema>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid session data" };
  const d = parsed.data;
  if (d.steps <= 0 && d.distanceM <= 0)
    return { ok: false as const, error: "Nothing to save yet." };

  const now = new Date();
  const { error } = await supabase.from("external_activities").insert({
    user_id: user.id,
    source: "walking_pad",
    // A unique-per-session id (no external system to dedupe against).
    external_id: `wp-${now.getTime()}`,
    activity_type: "Walk",
    name: "Walking pad",
    distance_m: d.distanceM || null,
    moving_time_s: d.movingSeconds || null,
    elapsed_time_s: d.movingSeconds || null,
    steps: d.steps || null,
    calories: d.calories || null,
    start_at: new Date(now.getTime() - d.movingSeconds * 1000).toISOString(),
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/activities");
  revalidatePath("/walking-pad");
  return { ok: true as const };
}
