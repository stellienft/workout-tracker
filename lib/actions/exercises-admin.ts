"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext, isAdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  searchExerciseDb,
  listByBodyPart,
  listAllExerciseDb,
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
 * True if the buffer starts with the magic bytes of an image we can serve.
 * Guards against saving an HTML error page or empty body as a ".gif" — which
 * uploads fine but shows nothing in the browser.
 */
function isImage(buf: Buffer): boolean {
  if (buf.byteLength < 12) return false;
  // GIF87a / GIF89a
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // WebP: "RIFF"...."WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return true;
  }
  return false;
}

/** MIME type to store the buffer under, derived from its magic bytes. */
function imageMime(buf: Buffer): string {
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x52 && buf[1] === 0x49) return "image/webp";
  return "image/gif";
}

/** Fetch a URL and return the bytes only if they are a real image. */
async function fetchImageBuf(
  url: string,
  headers?: Record<string, string>
): Promise<Buffer | null> {
  try {
    const res = await fetch(url, headers ? { headers } : undefined);
    if (!res.ok) return null;
    const b = Buffer.from(await res.arrayBuffer());
    return isImage(b) ? b : null;
  } catch {
    return null;
  }
}

/**
 * Download a demo GIF as a validated image buffer. ExerciseDB's CDN blocks
 * hotlinking (a browser <img> gets 403 via the Referer header), but a
 * server-side fetch has no Referer, so it downloads fine. Falls back to the
 * authenticated RapidAPI image endpoint (several resolutions) when the CDN
 * URL is missing or returns something that isn't an image.
 */
async function downloadGif(
  externalId: string,
  gifUrl: string | null
): Promise<Buffer | null> {
  // 1. Direct CDN fetch (server-side, no Referer → bypasses hotlink block).
  if (gifUrl && !gifUrl.includes(`/${GIF_BUCKET}/`)) {
    const b = await fetchImageBuf(gifUrl);
    if (b) return b;
  }
  // 2. Fallback: ExerciseDB's authenticated image endpoint (needs the key).
  const key = process.env.EXERCISEDB_API_KEY;
  const id = externalId.startsWith("exercisedb:")
    ? externalId.slice("exercisedb:".length)
    : null;
  if (key && id) {
    const auth = {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
    };
    for (const res of [360, 180]) {
      const b = await fetchImageBuf(
        `https://exercisedb.p.rapidapi.com/image?exerciseId=${encodeURIComponent(id)}&resolution=${res}`,
        auth
      );
      if (b) return b;
    }
  }
  return null;
}

/**
 * Download the demo image and store it on our own bucket, returning a
 * cache-busted public URL. Pass `force` to re-download even when the cover
 * already points at our storage (used to repair broken/empty files that an
 * earlier, un-validated run may have saved). Returns null when no valid image
 * could be fetched, so callers can leave the existing value untouched.
 */
async function rehostGif(
  supabase: Awaited<ReturnType<typeof createClient>>,
  externalId: string,
  gifUrl: string | null,
  force = false
): Promise<string | null> {
  if (!force && gifUrl && gifUrl.includes(`/${GIF_BUCKET}/`)) return gifUrl; // already ours
  const buf = await downloadGif(externalId, gifUrl);
  if (!buf) return force ? null : gifUrl;
  try {
    const path = `${externalId.replace(/[^a-z0-9]+/gi, "_")}.gif`;
    const { error } = await supabase.storage
      .from(GIF_BUCKET)
      .upload(path, buf, { contentType: imageMime(buf), upsert: true });
    if (error) return force ? null : gifUrl;
    const base = supabase.storage.from(GIF_BUCKET).getPublicUrl(path).data.publicUrl;
    // Cache-bust so browsers/CDN drop any previously-cached broken response.
    return `${base}?v=${Date.now()}`;
  } catch {
    return force ? null : gifUrl;
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

const REHOST_BATCH = 15;

/**
 * Backfill: (re-)download every imported ExerciseDB demo GIF onto our own
 * storage, overwriting any broken/empty file a previous un-validated run may
 * have saved. Force-re-downloads by external id — it does NOT skip covers that
 * already point at our bucket — validates the bytes are a real image, and
 * cache-busts the URL. Processes one page and returns pagination so the caller
 * can loop to completion.
 */
export async function rehostExerciseGifs(offset = 0) {
  const { roles } = await getAuthContext();
  if (!isAdminRole(roles)) return { ok: false as const, error: "Admins only" };

  const start = Math.max(0, Math.floor(offset));
  const supabase = await createClient();

  const { count } = await supabase
    .from("exercises")
    .select("id", { count: "exact", head: true })
    .eq("source", "exercisedb");

  const { data: rows } = await supabase
    .from("exercises")
    .select("id, external_id, cover_image_path")
    .eq("source", "exercisedb")
    .order("id", { ascending: true })
    .range(start, start + REHOST_BATCH - 1);

  const batch = rows ?? [];
  let rehosted = 0;
  let failed = 0;
  for (const r of batch) {
    const newUrl = await rehostGif(
      supabase,
      (r.external_id as string) ?? (r.id as string),
      (r.cover_image_path as string) ?? null,
      true // force a fresh, validated download even if it's already ours
    );
    if (newUrl) {
      await supabase.from("exercises").update({ cover_image_path: newUrl }).eq("id", r.id);
      rehosted += 1;
    } else {
      failed += 1;
    }
  }

  const nextOffset = start + batch.length;
  const total = count ?? nextOffset;
  const hasMore = batch.length === REHOST_BATCH && nextOffset < total;

  if (nextOffset === 0) {
    return {
      ok: true as const,
      rehosted: 0,
      failed: 0,
      nextOffset: 0,
      hasMore: false,
      total: 0,
      message: "No imported exercises to re-host yet.",
    };
  }

  if (!hasMore) {
    revalidatePath("/exercises");
    revalidatePath("/admin/exercises");
  }

  return {
    ok: true as const,
    rehosted,
    failed,
    nextOffset,
    hasMore,
    total,
    message:
      `Re-hosted ${rehosted} of ${batch.length}` +
      (failed ? `, ${failed} failed` : "") +
      (hasMore ? ` — ${nextOffset}/${total} done, continuing…` : ` (${total} total).`),
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

// ---------------------------------------------------------------------------
// Free, key-less bulk import from the open-source exercise dataset
// (github.com/yuhonas/free-exercise-db, MIT licence). Uses NO RapidAPI quota:
// the data + images come straight from GitHub. Batched so a full ~870-exercise
// import never times out; the admin UI loops until hasMore is false.
// ---------------------------------------------------------------------------
const FREE_DB_JSON =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const FREE_DB_IMG =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

interface FreeExercise {
  id: string;
  name: string;
  category?: string;
  level?: string;
  equipment?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  images?: string[];
}

// Map free-exercise-db muscle names onto the app's simple tokens.
const FREE_MUSCLE_MAP: Record<string, string> = {
  abdominals: "core",
  chest: "chest",
  lats: "lats",
  "middle back": "back",
  "lower back": "back",
  traps: "back",
  neck: "back",
  quadriceps: "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  calves: "calves",
  biceps: "biceps",
  triceps: "triceps",
  forearms: "forearms",
  shoulders: "shoulders",
  adductors: "quads",
  abductors: "glutes",
};
function mapFreeMuscle(m: string): string {
  const k = (m || "").trim().toLowerCase();
  return FREE_MUSCLE_MAP[k] ?? k;
}
function freeSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function freeDifficulty(level?: string): "beginner" | "intermediate" | "advanced" {
  const l = (level || "").toLowerCase();
  if (l === "expert" || l === "advanced") return "advanced";
  if (l === "intermediate") return "intermediate";
  return "beginner";
}
function freeToRow(e: FreeExercise) {
  const primary = (e.primaryMuscles ?? []).map(mapFreeMuscle).filter(Boolean);
  const secondary = (e.secondaryMuscles ?? []).map(mapFreeMuscle).filter(Boolean);
  return {
    name: e.name,
    // Namespaced slug so it can never collide with seed/exercisedb slugs.
    slug: `fdb-${freeSlug(e.id)}`,
    category: (e.category ?? "").toLowerCase() === "cardio" ? "cardio" : "strength",
    primary_muscles: Array.from(new Set(primary)),
    secondary_muscles: Array.from(new Set(secondary)),
    equipment: e.equipment ? [String(e.equipment).toLowerCase()] : [],
    difficulty: freeDifficulty(e.level),
    instructions: (e.instructions ?? []).join(" ").slice(0, 2000) || null,
    cover_image_path: e.images?.[0]
      ? FREE_DB_IMG + e.images[0].split("/").map(encodeURIComponent).join("/")
      : null,
    status: "published",
    source: "freedb",
    external_id: `freedb:${e.id}`,
  };
}

/**
 * Import one batch of the free catalog. Call repeatedly with the returned
 * nextOffset until hasMore is false. Deduped on external_id, so it is safe to
 * re-run and it tops up rather than duplicating.
 */
export async function importFreeCatalog(offset = 0) {
  const { roles } = await getAuthContext();
  if (!isAdminRole(roles)) return { ok: false as const, error: "Admins only" };

  let all: FreeExercise[];
  try {
    const res = await fetch(FREE_DB_JSON, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`dataset fetch failed (${res.status})`);
    all = (await res.json()) as FreeExercise[];
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Couldn't fetch the free dataset",
    };
  }

  const total = all.length;
  const BATCH = 150;
  const rawSlice = all.slice(offset, offset + BATCH);
  const rows = rawSlice.filter((e) => e?.id && e?.name).map(freeToRow);

  let imported = 0;
  if (rows.length) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("exercises")
      .upsert(rows, { onConflict: "external_id", ignoreDuplicates: false })
      .select("id");
    if (error) return { ok: false as const, error: error.message };
    imported = data?.length ?? rows.length;
  }

  const nextOffset = offset + rawSlice.length;
  const hasMore = nextOffset < total;
  if (!hasMore) {
    revalidatePath("/admin/exercises");
    revalidatePath("/exercises");
  }
  return { ok: true as const, imported, total, nextOffset, hasMore };
}

/**
 * Import the ENTIRE ExerciseDB catalogue (needs a RapidAPI key with quota —
 * one request per page). Metadata + GIF URL only; it does NOT download GIFs
 * inline (that would time out over ~1,300 exercises), so run "Re-host GIFs"
 * afterwards to pull the animations onto our own storage. Batched: call with
 * the returned nextOffset until hasMore is false. Deduped on external_id.
 */
export async function importAllExerciseDb(offset = 0) {
  const { roles } = await getAuthContext();
  if (!isAdminRole(roles)) return { ok: false as const, error: "Admins only" };

  const LIMIT = 100;
  let batch: NormalizedExercise[];
  try {
    batch = await listAllExerciseDb(LIMIT, offset);
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "ExerciseDB request failed",
    };
  }

  let imported = 0;
  if (batch.length) {
    const supabase = await createClient();
    const rows = batch.map(toRow);
    const { data, error } = await supabase
      .from("exercises")
      .upsert(rows, { onConflict: "external_id", ignoreDuplicates: false })
      .select("id");
    if (error) return { ok: false as const, error: error.message };
    imported = data?.length ?? rows.length;
  }

  // ExerciseDB returns a short (or empty) page once we run past the end.
  const hasMore = batch.length === LIMIT;
  const nextOffset = offset + batch.length;
  if (!hasMore) {
    revalidatePath("/admin/exercises");
    revalidatePath("/exercises");
  }
  return { ok: true as const, imported, nextOffset, hasMore };
}
