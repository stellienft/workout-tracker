"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Toggle whether the member appears on the public leaderboard. */
export async function setLeaderboardOptIn(optIn: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ leaderboard_opt_in: optIn })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/leaderboard");
  return { ok: true as const };
}
