"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "progress-photos";

const recordSchema = z.object({
  // The object the browser already uploaded to the private bucket. It must live
  // under the caller's own folder so it satisfies the storage RLS policy.
  storagePath: z.string().min(1).max(300),
  pose: z.enum(["front", "side", "back", "other"]).default("front"),
  takenOn: z.string().optional(),
  weightKg: z.coerce.number().min(20).max(400).optional(),
  note: z.string().max(500).optional(),
});

/**
 * Records a progress photo the browser has already uploaded to storage.
 *
 * The file itself is uploaded straight to the private `progress-photos` bucket
 * from the client (see components/progress/progress-photos.tsx). Sending the
 * image through this Server Action would hit the request-body size limit and
 * silently fail for any normal phone photo — so the action only writes the
 * metadata row here, after verifying the object belongs to the caller.
 */
export async function recordProgressPhoto(input: {
  storagePath: string;
  pose?: string;
  takenOn?: string;
  weightKg?: number;
  note?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { storagePath, pose, takenOn, weightKg, note } = parsed.data;

  // The path must sit under the user's own folder — anything else is rejected
  // before we trust it (defence in depth on top of the storage RLS policy).
  if (!storagePath.startsWith(`${user.id}/`)) {
    return { ok: false, error: "Invalid upload path." };
  }

  const { error: insertError } = await supabase.from("progress_photos").insert({
    user_id: user.id,
    storage_path: storagePath,
    pose,
    taken_on: takenOn || undefined,
    weight_kg: weightKg ?? null,
    note: note ?? null,
  });
  if (insertError) {
    // Roll back the orphaned upload so storage and table stay consistent.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, error: insertError.message };
  }

  revalidatePath("/progress");
  return { ok: true };
}

export async function deleteProgressPhoto(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: row } = await supabase
    .from("progress_photos")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Photo not found." };

  await supabase.storage.from(BUCKET).remove([row.storage_path]);
  const { error } = await supabase
    .from("progress_photos")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/progress");
  return { ok: true };
}
