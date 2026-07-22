"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext, isAdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { searchWger, type NormalizedExercise } from "@/lib/wger";

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
    source: "wger",
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

export async function importWgerExercises(input: { query: string; number?: number }) {
  const { roles } = await getAuthContext();
  if (!isAdminRole(roles)) return { ok: false as const, error: "Admins only" };

  const parsed = z
    .object({
      query: z.string().min(2).max(80),
      number: z.coerce.number().int().min(1).max(20).default(10),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };

  let exercises: NormalizedExercise[];
  try {
    exercises = await searchWger({ query: parsed.data.query, number: parsed.data.number });
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "wger request failed",
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

const STARTER_SEARCHES = [
  "bench press",
  "squat",
  "deadlift",
  "shoulder press",
  "row",
  "pull up",
  "lunge",
  "bicep curl",
  "tricep",
  "plank",
  "lat pulldown",
  "leg press",
];

/** One-click: run a spread of compound-lift searches and import them all. */
export async function seedStarterExercises() {
  const { roles } = await getAuthContext();
  if (!isAdminRole(roles)) return { ok: false as const, error: "Admins only" };

  const collected: NormalizedExercise[] = [];
  let firstError: string | null = null;
  for (const q of STARTER_SEARCHES) {
    try {
      const batch = await searchWger({ query: q, number: 4 });
      collected.push(...batch);
    } catch (err) {
      if (!firstError) firstError = err instanceof Error ? err.message : String(err);
    }
  }

  if (collected.length === 0) {
    return { ok: false as const, error: firstError ?? "No exercises returned from wger." };
  }

  try {
    const { imported } = await upsertExercises(collected);
    revalidatePath("/admin/exercises");
    revalidatePath("/exercises");
    return {
      ok: true as const,
      imported,
      message: `Imported ${imported} exercises across the main movements.`,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Could not save exercises",
    };
  }
}
