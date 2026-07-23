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

/** Toggle an exercise in the member's favourites. */
export async function toggleExerciseFavorite(exerciseId: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z.string().uuid().safeParse(exerciseId);
  if (!parsed.success) return { ok: false as const, error: "Invalid" };

  const { data: existing } = await supabase
    .from("exercise_favorites")
    .select("exercise_id")
    .eq("user_id", user.id)
    .eq("exercise_id", parsed.data)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("exercise_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("exercise_id", parsed.data);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase
      .from("exercise_favorites")
      .insert({ user_id: user.id, exercise_id: parsed.data });
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath("/exercises");
  return { ok: true as const, favorited: !existing };
}
