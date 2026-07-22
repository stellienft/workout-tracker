"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Save the avatar URL after the client uploads the file to storage. */
export async function saveAvatarUrl(url: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = z.string().url().max(500).safeParse(url);
  if (!parsed.success) return { ok: false as const, error: "Invalid image URL" };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: parsed.data })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/profile");
  return { ok: true as const };
}
