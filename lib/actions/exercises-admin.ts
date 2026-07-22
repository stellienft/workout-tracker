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

async function upsertExercises(exercises: NormalizedExercise[]) {
  const byId = new Map(exercises.map((e) => [e.externalId, e]));
  const rows = Array.from(byId.values()).map(toRow);
  if (rows.length === 0) return { imported: 0 };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .upsert(rows, { onConflict: "external_id", ignoreDuplicates: false })
    .select("id");
  if (error) throw new Error(error.message);
  return { imported: data?.length ?? rows.length };
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
