"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "progress-photos";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

const metaSchema = z.object({
  pose: z.enum(["front", "side", "back", "other"]).default("front"),
  takenOn: z.string().optional(),
  weightKg: z.coerce.number().min(20).max(400).optional(),
  note: z.string().max(500).optional(),
});

function extFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/heic") return "heic";
  return "jpg";
}

export async function uploadProgressPhoto(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a photo." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Photo is too large (max 8 MB)." };
  }
  if (file.type && !ALLOWED.includes(file.type)) {
    return { ok: false, error: "Unsupported image type." };
  }

  const parsed = metaSchema.safeParse({
    pose: formData.get("pose") ?? undefined,
    takenOn: formData.get("takenOn") ?? undefined,
    weightKg: formData.get("weightKg") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const meta = parsed.data;

  const ext = extFor(file.type);
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { error: insertError } = await supabase.from("progress_photos").insert({
    user_id: user.id,
    storage_path: path,
    pose: meta.pose,
    taken_on: meta.takenOn || undefined,
    weight_kg: meta.weightKg ?? null,
    note: meta.note ?? null,
  });
  if (insertError) {
    // Roll back the orphaned upload so storage and table stay consistent.
    await supabase.storage.from(BUCKET).remove([path]);
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
