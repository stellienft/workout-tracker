"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext, isAdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  buildInsights,
  type AnalysisSet,
  type ExerciseMeta,
  type TrainingInsights,
} from "@/lib/ai/analysis";
import { generateProgram } from "@/lib/ai/program-generator";
import { llmCoachNarrative } from "@/lib/ai/coach-narrative";

const ANALYSIS_WINDOW_DAYS = 120;

async function loadInsights(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ insights: TrainingInsights; metaById: Map<string, ExerciseMeta> }> {
  const cutoff = new Date(Date.now() - ANALYSIS_WINDOW_DAYS * 86400000).toISOString();

  const [{ data: sessions }, { data: logs }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("started_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("started_at", { ascending: true })
      .limit(500),
    supabase
      .from("set_logs")
      .select("exercise_id, weight_kg, reps, rpe, completed, created_at")
      .eq("user_id", userId)
      .gte("created_at", cutoff)
      .limit(8000),
  ]);

  const sessionDates = (sessions ?? []).map((s) => s.started_at as string);
  const sets: AnalysisSet[] = (logs ?? []).map((l) => ({
    exerciseId: l.exercise_id as string,
    weightKg: (l.weight_kg as number | null) ?? null,
    reps: (l.reps as number | null) ?? null,
    rpe: (l.rpe as number | null) ?? null,
    completed: (l.completed as boolean) ?? false,
    at: l.created_at as string,
  }));

  const exerciseIds = Array.from(new Set(sets.map((s) => s.exerciseId)));
  const metaById = new Map<string, ExerciseMeta>();
  if (exerciseIds.length) {
    const { data: exRows } = await supabase
      .from("exercises")
      .select("id, name, primary_muscles, category")
      .in("id", exerciseIds);
    for (const e of exRows ?? []) {
      metaById.set(e.id as string, {
        id: e.id as string,
        name: e.name as string,
        primaryMuscles: (e.primary_muscles as string[]) ?? [],
        category: (e.category as string) ?? "",
      });
    }
  }

  return { insights: buildInsights(sessionDates, sets, metaById), metaById };
}

/**
 * The member's training insights, plus a coaching note and any existing
 * AI-generated split. Insights are computed live so they're always current.
 */
export async function getTrainingInsights() {
  const { supabase, user, roles } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  // Admins can unlock the coach early to test it, regardless of the 4-week gate.
  const testMode = isAdminRole(roles);

  const { insights } = await loadInsights(supabase, user.id);
  if (testMode) insights.consistency.eligible = true;

  const narrative = insights.consistency.eligible
    ? await llmCoachNarrative(insights)
    : null;

  const { data: aiSplit } = await supabase
    .from("custom_splits")
    .select("id, name, updated_at")
    .eq("owner_user_id", user.id)
    .eq("ai_generated", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ok: true as const,
    insights,
    narrative,
    aiSplitId: (aiSplit?.id as string) ?? null,
    testMode,
  };
}

/**
 * Build (or rebuild) the member's adaptive split from their own history and
 * save it as a custom split they can train immediately. Gated on 4 weeks of
 * consistent use.
 */
export async function generateAdaptiveProgram(input?: { daysPerWeek?: number }) {
  const { supabase, user, roles } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const testMode = isAdminRole(roles);

  const daysParsed = z
    .object({ daysPerWeek: z.coerce.number().int().min(3).max(5).optional() })
    .safeParse(input ?? {});
  if (!daysParsed.success) return { ok: false as const, error: "Invalid input" };

  const { insights, metaById } = await loadInsights(supabase, user.id);
  if (!insights.consistency.eligible && !testMode) {
    return {
      ok: false as const,
      error:
        "Adaptive programming unlocks after 4 weeks of consistent training. Keep logging your workouts.",
    };
  }

  // Full published library as the fill pool.
  const { data: libRows } = await supabase
    .from("exercises")
    .select("id, name, primary_muscles, category")
    .eq("status", "published");
  const library: ExerciseMeta[] = (libRows ?? []).map((e) => ({
    id: e.id as string,
    name: e.name as string,
    primaryMuscles: (e.primary_muscles as string[]) ?? [],
    category: (e.category as string) ?? "",
  }));
  // Ensure the member's own logged exercises are always resolvable.
  for (const [id, meta] of metaById) {
    if (!library.some((l) => l.id === id)) library.push(meta);
  }

  if (library.length === 0) {
    return { ok: false as const, error: "No exercises available to build a plan." };
  }

  const program = generateProgram(insights, library, {
    daysPerWeek: daysParsed.data.daysPerWeek,
  });

  // Replace any previous AI-generated split (leave hand-built splits alone).
  await supabase
    .from("custom_splits")
    .delete()
    .eq("owner_user_id", user.id)
    .eq("ai_generated", true);

  const { data: split, error: splitErr } = await supabase
    .from("custom_splits")
    .insert({
      owner_user_id: user.id,
      name: program.name,
      description: program.description,
      ai_generated: true,
    })
    .select("id")
    .single();
  if (splitErr || !split) {
    return { ok: false as const, error: splitErr?.message ?? "Could not create plan" };
  }

  let dayNumber = 0;
  for (const day of program.days) {
    dayNumber += 1;
    const { data: dayRow, error: dayErr } = await supabase
      .from("custom_split_days")
      .insert({
        split_id: split.id,
        day_number: dayNumber,
        name: day.name,
        focus_muscles: day.focusMuscles,
      })
      .select("id")
      .single();
    if (dayErr || !dayRow) continue;

    const rows = day.exercises.map((e, i) => ({
      split_day_id: dayRow.id,
      exercise_id: e.exerciseId,
      position: i + 1,
      sets: e.sets,
      rep_target: e.repTarget,
      rest_seconds: e.restSeconds,
      notes: e.targetWeightKg ? `Target ~${e.targetWeightKg} kg · ${e.note}` : e.note,
    }));
    if (rows.length) {
      await supabase.from("custom_split_day_exercises").insert(rows);
    }
  }

  revalidatePath("/ai-coach");
  revalidatePath("/splits");
  return { ok: true as const, id: split.id, daysPerWeek: program.daysPerWeek };
}
