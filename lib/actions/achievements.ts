"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { loadAchievements } from "@/lib/achievements-loader";

/**
 * Recompute the member's achievements, persist any newly-earned ones (and
 * "level up" personal-record badges that were beaten), and report which keys
 * are new so the client can celebrate. Idempotent — safe to call on page load.
 */
export async function syncAchievements() {
  const { supabase, user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const achievements = await loadAchievements(supabase, user.id);

  const { data: existingRows } = await supabase
    .from("user_achievements")
    .select("key, value")
    .eq("user_id", user.id);

  const existing = new Map<string, number | null>(
    (existingRows ?? []).map((r) => [r.key as string, (r.value as number | null) ?? null])
  );

  const newlyEarned: string[] = [];
  const toUpsert: { user_id: string; key: string; value: number | null; achieved_at: string }[] = [];

  for (const a of achievements) {
    if (!existing.has(a.key)) {
      newlyEarned.push(a.key);
      toUpsert.push({ user_id: user.id, key: a.key, value: a.value, achieved_at: a.achievedAt });
    } else {
      const prev = existing.get(a.key) ?? null;
      // Personal-record badges level up when the value improves.
      if (a.value !== null && (prev === null || a.value > prev)) {
        newlyEarned.push(a.key);
        toUpsert.push({ user_id: user.id, key: a.key, value: a.value, achieved_at: a.achievedAt });
      }
    }
  }

  if (toUpsert.length) {
    await supabase.from("user_achievements").upsert(toUpsert, { onConflict: "user_id,key" });
    revalidatePath("/achievements");
  }

  return {
    ok: true as const,
    total: achievements.length,
    newlyEarned,
  };
}
