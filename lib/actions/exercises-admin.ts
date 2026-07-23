"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext, isAdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  searchExerciseDb,
  listByBodyPart,
  type NormalizedExercise,
} from "@/lib/exercisedb";

function toRow(e: NormalizedExercise) {
  return {
    name: e.name,
    slug: e.slug,
    category: e.category,
    primary_muscles: e.primaryMuscles,
    secondary_muscles: e.secondaryMuscles,
    equipment: e.equipment,
    difficulty: "intermediate",
    instructions: e.instructions,
    cover_image_path: e.imageUrl,
    status: "published",
    source: "exercisedb",
    external_id: e.externalId,
  };
}

const GIF_BUCKET = "exercise-gifs";

/**
 * Download a demo GIF and re-host it on our storage. ExerciseDB's CDN blocks
 * hotlinking (a browser <img> gets 403 via the Referer header), but a
 * server-side fetch has no Referer, so it downloads fine. Returns the public
 * storage URL, or the original URL if the download/upload fails.
 */
async function downloadGif(externalId: string, gifUrl: string): Promise<Buffer | null> {
  // 1. Direct CDN fetch (server-side, no Referer → bypasses hotlink block).
  try {
    const res = await fetch(gifUrl);
    if (res.ok) {
      const b = Buffer.from(await res.arrayBuffer());
      if (b.byteLength > 0) return b;
    }
  } catch {
    /* fall through */
  }
  // 2. Fallback: ExerciseDB's authenticated image endpoint (needs the key).
  const key = process.env.EXERCISEDB_API_KEY;
  const id = externalId.startsWith("exercisedb:")
    ? externalId.slice("exercisedb:".length)
    : null;
  if (key && id) {
    try {
      const res = await fetch(
        `https://exercisedb.p.rapidapi.com/image?exerciseId=${encodeURIComponent(id)}&resolution=360`,
        {
          headers: {
            "X-RapidAPI-Key": key,
            "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
          },
        }
      );
      if (res.ok) {
        const b = Buffer.from(await res.arrayBuffer());
        if (b.byteLength > 0) return b;
      }
    } catch {
      /* give up */
    }
  }
  return null;
}

async function rehostGif(
  supabase: Awaited<ReturnType<typeof createClient>>,
  externalId: string,
  gifUrl: string | null
): Promise<string | null> {
  if (!gifUrl) return null;
  if (gifUrl.includes(`/${GIF_BUCKET}/`)) return gifUrl; // already ours
  const buf = await downloadGif(externalId, gifUrl);
  if (!buf) return gifUrl;
  try {
    const path = `${externalId.replace(/[^a-z0-9]+/gi, "_")}.gif`;
    const { error } = await supabase.storage
      .from(GIF_BUCKET)
      .upload(path, buf, { contentType: "image/gif", upsert: true });
    if (error) return gifUrl;
    return supabase.storage.from(GIF_BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return gifUrl;
  }
}

async function rehostAll(
  supabase: Awaited<ReturnType<typeof createClient>>,
  exercises: NormalizedExercise[]
) {
  const CONCURRENCY = 5;
  for (let i = 0; i < exercises.length; i += CONCURRENCY) {
    const chunk = exercises.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (e) => {
        e.imageUrl = await rehostGif(supabase, e.externalId, e.imageUrl);
      })
    );
  }
}

async function upsertExercises(exercises: NormalizedExercise[]) {
  const byId = new Map(exercises.map((e) => [e.externalId, e]));
  const list = Array.from(byId.values());
  if (list.length === 0) return { imported: 0 };

  const supabase = await createClient();
  await rehostAll(supabase, list); // pull GIFs onto our storage
  const rows = list.map(toRow);

  const { data, error } = await supabase
    .from("exercises")
    .upsert(rows, { onConflict: "external_id", ignoreDuplicates: false })
    .select("id");
  if (error) throw new Error(error.message);
  return { imported: data?.length ?? rows.length };
}

/**
 * Backfill: re-host GIFs for already-imported exercises whose cover still points
 * at ExerciseDB's (hotlink-protected) CDN. Processes a batch and is re-runnable.
 */
export async function rehostExerciseGifs() {
  const { roles } = await getAuthContext();
  if (!isAdminRole(roles)) return { ok: false as const, error: "Admins only" };

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("exercises")
    .select("id, external_id, cover_image_path")
    .eq("source", "exercisedb")
    .not("cover_image_path", "is", null)
    .limit(20);

  const todo = (rows ?? []).filter(
    (r) => r.cover_image_path && !String(r.cover_image_path).includes(`/${GIF_BUCKET}/`)
  );
  if (todo.length === 0) {
    return { ok: true as const, rehosted: 0, message: "All exercise GIFs are already re-hosted." };
  }

  let done = 0;
  for (const r of todo) {
    const newUrl = await rehostGif(
      supabase,
      (r.external_id as string) ?? (r.id as string),
      r.cover_image_path as string
    );
    if (newUrl && newUrl !== r.cover_image_path) {
      await supabase.from("exercises").update({ cover_image_path: newUrl }).eq("id", r.id);
      done += 1;
    }
  }

  revalidatePath("/exercises");
  revalidatePath("/admin/exercises");
  return {
    ok: true as const,
    rehosted: done,
    message:
      `Re-hosted ${done} GIF${done === 1 ? "" : "s"}.` +
      (todo.length === 20 ? " Run again for the rest." : ""),
  };
}

export async function importExercises(input: { query: string; number?: number }) {
  const { roles } = await getAuthContext();
  if (!isAdminRole(roles)) return { ok: false as const, error: "Admins only" };

  const parsed = z
    .object({
      query: z.string().min(2).max(80),
      number: z.coerce.number().int().min(1).max(25).default(10),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };

  let exercises: NormalizedExercise[];
  try {
    exercises = await searchExerciseDb({
      query: parsed.data.query,
      number: parsed.data.number,
    });
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "ExerciseDB request failed",
    };
  }

  if (exercises.length === 0) {
    return { ok: true as const, imported: 0, message: "No exercises found for that search." };
  }

  try {
    const { imported } = await upsertExercises(exercises);
    revalidatePath("/admin/exercises");
    revalidatePath("/exercises");
    return { ok: true as const, imported };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Could not save exercises",
    };
  }
}

// A spread across body parts to fill the library.
const STARTER_BODY_PARTS: { part: string; number: number }[] = [
  { part: "chest", number: 6 },
  { part: "back", number: 6 },
  { part: "upper legs", number: 6 },
  { part: "shoulders", number: 5 },
  { part: "upper arms", number: 6 },
  { part: "lower arms", number: 3 },
  { part: "waist", number: 5 },
  { part: "lower legs", number: 4 },
  { part: "cardio", number: 3 },
];

/** One-click: pull a spread of exercises across every body part. */
export async function seedStarterExercises() {
  const { roles } = await getAuthContext();
  if (!isAdminRole(roles)) return { ok: false as const, error: "Admins only" };

  const collected: NormalizedExercise[] = [];
  let firstError: string | null = null;
  for (const s of STARTER_BODY_PARTS) {
    try {
      const batch = await listByBodyPart(s.part, s.number);
      collected.push(...batch);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!firstError) firstError = msg;
      // 401/403 = bad/missing key; no point continuing.
      if (/401|403|key/i.test(msg)) break;
    }
  }

  if (collected.length === 0) {
    return { ok: false as const, error: firstError ?? "No exercises returned." };
  }

  try {
    const { imported } = await upsertExercises(collected);
    revalidatePath("/admin/exercises");
    revalidatePath("/exercises");
    return {
      ok: true as const,
      imported,
      message: `Imported ${imported} exercises across the body parts.`,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Could not save exercises",
    };
  }
}
