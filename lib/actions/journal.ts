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

/** Save (or clear) the member's free-form journal note for a given day. */
export async function saveDailyJournal(entryDate: string, body: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z
    .object({
      entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      body: z.string().max(6000),
    })
    .safeParse({ entryDate, body });
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const trimmed = parsed.data.body.trim();

  if (!trimmed) {
    // Empty note clears the day's entry.
    await supabase
      .from("journal_entries")
      .delete()
      .eq("user_id", user.id)
      .eq("entry_date", parsed.data.entryDate);
    revalidatePath("/dashboard");
    return { ok: true as const };
  }

  const { error } = await supabase.from("journal_entries").upsert(
    {
      user_id: user.id,
      entry_date: parsed.data.entryDate,
      body: trimmed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,entry_date" }
  );
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true as const };
}
