"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayInTz, DEFAULT_TZ } from "@/lib/timezone";

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Add a new journal entry (append-only log — each save is its own card). An
 * optional voice recording (already uploaded to the journal-audio bucket) can
 * be attached by its storage path.
 */
export async function addJournalEntry(body: string, audioPath?: string | null) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = z
    .object({
      body: z.string().max(6000),
      audioPath: z.string().max(300).nullish(),
    })
    .safeParse({ body, audioPath });
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const text = parsed.data.body.trim();
  const audio = parsed.data.audioPath ?? null;
  if (!text && !audio) return { ok: false as const, error: "Nothing to save." };

  // An attached audio path must live under the member's own folder.
  if (audio && !audio.startsWith(`${user.id}/`))
    return { ok: false as const, error: "Invalid audio." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const entryDate = todayInTz((profile?.timezone as string | null) || DEFAULT_TZ);

  const { error } = await supabase.from("journal_entries").insert({
    user_id: user.id,
    entry_date: entryDate,
    body: text,
    audio_path: audio,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/journal");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/** Delete one of the member's journal entries (and its audio, if any). */
export async function deleteJournalEntry(id: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false as const, error: "Invalid" };

  const { data: row } = await supabase
    .from("journal_entries")
    .select("audio_path")
    .eq("id", parsed.data)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  const audioPath = row?.audio_path as string | null | undefined;
  if (audioPath) {
    await supabase.storage.from("journal-audio").remove([audioPath]);
  }

  revalidatePath("/journal");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
