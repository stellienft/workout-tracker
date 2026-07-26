"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext, isAdminRole } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
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

  const { isPro } = await getUserPlan();
  if (!isPro) return { ok: false as const, error: "AI Coach is a Pro feature." };

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

// ============================================================
// Gym Q&A — ask the AI Coach a question
// ============================================================

const GYM_SYSTEM_PROMPT =
  "You are Stellio Fit's AI Coach — a knowledgeable, encouraging personal trainer. " +
  "Answer ONLY questions related to gym, fitness, strength training, exercise technique, " +
  "workout programming, warm-ups, cool-downs, stretching, mobility, nutrition for training, " +
  "recovery, and injury prevention in a gym context. " +
  "If a question is about anything unrelated (politics, coding, relationships, general knowledge, etc.), " +
  "politely say you can only help with gym and fitness topics, and suggest they ask a fitness question. " +
  "Keep answers concise, practical, and actionable (2-4 short paragraphs max). " +
  "Use plain text — no markdown, no headers, no bullet lists. Be friendly and encouraging.";

export async function askCoach(question: string) {
  const { user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { isPro } = await getUserPlan();
  if (!isPro) return { ok: false as const, error: "AI Coach is a Pro feature." };

  const q = z.string().min(1).max(500).safeParse(question);
  if (!q.success) return { ok: false as const, error: "Question too long (max 500 chars)." };

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return {
      ok: false as const,
      error: "AI Coach Q&A is not configured. Please try again later.",
    };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: GYM_SYSTEM_PROMPT,
        messages: [{ role: "user", content: q.data }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return { ok: false as const, error: "Could not reach the AI Coach. Please try again." };
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = data.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text)
      .join(" ")
      .trim();

    if (!text) {
      return { ok: false as const, error: "No response from the AI Coach." };
    }

    return { ok: true as const, answer: text };
  } catch {
    return { ok: false as const, error: "The AI Coach is busy. Please try again." };
  }
}

// ============================================================
// AI Supplement Advisor — educational recommendations
// ============================================================

const SUPPLEMENT_SYSTEM_PROMPT =
  "You are Stellio Fit's Supplement Advisor — an evidence-based sports nutritionist. " +
  "Your role is STRICTLY EDUCATIONAL. You recommend supplements based on a member's training profile. " +
  "Cover categories: protein (whey, casein, plant-based), performance (creatine, beta-alanine, citrulline), " +
  "recovery (magnesium, zinc, omega-3), and essential vitamins (D, B12, C, multivitamins). " +
  "Rules:\n" +
  "1. Base recommendations on the member's training data provided.\n" +
  "2. For each supplement, give: name, category, what it does, why it's relevant to their training, typical dosing, timing, and food sources.\n" +
  "3. Prioritise supplements by relevance to their actual training (e.g. heavy lifters → creatine, endurance → electrolytes).\n" +
  "4. Never recommend banned or illegal substances.\n" +
  "5. Keep it concise — 3-5 supplements max.\n" +
  "6. You MUST respond with ONLY a valid JSON array, no other text. Each element: " +
  '{"name":"Creatine Monohydrate","category":"Performance","purpose":"Increases ATP production for short bursts of power","relevance":"Directly supports your heavy compound lifting","dosing":"3-5g daily","timing":"Any time, consistently","foodSources":"Red meat, fish"}' + "\n" +
  "7. Category must be one of: Protein, Performance, Recovery, Vitamins.";

export async function getSupplementAdvice() {
  const { supabase, user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { isPro } = await getUserPlan();
  if (!isPro) return { ok: false as const, error: "AI Coach is a Pro feature." };

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { ok: false as const, error: "Supplement Advisor is not configured." };
  }

  // Build a training summary from the user's logged data
  const cutoff = new Date(Date.now() - 120 * 86400000).toISOString();
  const [{ data: sessions }, { data: logs }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("started_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(100),
    supabase
      .from("set_logs")
      .select("exercise_id, weight_kg, reps, created_at")
      .eq("user_id", user.id)
      .gte("created_at", cutoff)
      .limit(2000),
  ]);

  const sessionCount = sessions?.length ?? 0;
  const logCount = logs?.length ?? 0;

  // Get exercise names for muscle groups
  const exerciseIds = Array.from(new Set((logs ?? []).map((l) => l.exercise_id as string))).slice(0, 20);
  let muscleGroups: string[] = [];
  if (exerciseIds.length) {
    const { data: exRows } = await supabase
      .from("exercises")
      .select("id, name, primary_muscles, category")
      .in("id", exerciseIds);
    const muscles = new Set<string>();
    for (const e of exRows ?? []) {
      for (const m of (e.primary_muscles as string[]) ?? []) muscles.add(m);
    }
    muscleGroups = Array.from(muscles).slice(0, 10);
  }

  // Get user's goal from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, goal, experience_level")
    .eq("id", user.id)
    .maybeSingle();

  // Get current split (training plan)
  const { data: currentSplit } = await supabase
    .from("custom_splits")
    .select("name, description")
    .eq("owner_user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const trainingSummary = {
    goal: profile?.goal ?? "general fitness",
    experience: profile?.experience_level ?? "intermediate",
    sessionsLast120d: sessionCount,
    setsLast120d: logCount,
    muscleGroupsTrained: muscleGroups,
    currentSplit: currentSplit?.name ?? "No active split",
    avgPerWeek: sessionCount > 0 ? (sessionCount / 17).toFixed(1) : "0",
  };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: SUPPLEMENT_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content:
              `Here is my training profile (JSON):\n${JSON.stringify(trainingSummary)}\n\n` +
              `Based on this, recommend 3-5 supplements relevant to my training. ` +
              `Respond with ONLY a JSON array, no other text.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return { ok: false as const, error: "Could not generate supplement advice." };
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = data.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text)
      .join(" ")
      .trim();

    if (!text) {
      return { ok: false as const, error: "No response from the advisor." };
    }

    // Parse the JSON array from the response
    let supplements: SupplementRecommendation[];
    try {
      // Extract JSON array from the text (handles cases where Claude wraps in prose)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      supplements = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      if (!Array.isArray(supplements)) throw new Error("not an array");
    } catch {
      return { ok: false as const, error: "Could not parse recommendations. Please try again." };
    }

    return { ok: true as const, supplements };
  } catch {
    return { ok: false as const, error: "The advisor is busy. Please try again." };
  }
}

export interface SupplementRecommendation {
  name: string;
  category: "Protein" | "Performance" | "Recovery" | "Vitamins";
  purpose: string;
  relevance: string;
  dosing: string;
  timing: string;
  foodSources: string;
}

// ============================================================
// AI Muscle Balance Suggestions
// ============================================================

export async function getMuscleSuggestions(undertrainedMuscles: string[]) {
  if (undertrainedMuscles.length === 0) {
    return { ok: true as const, suggestions: "No undertrained muscles detected. Great balance!" };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { ok: false as const, error: "AI Coach is not configured." };
  }

  const muscleList = undertrainedMuscles.join(", ");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system:
          "You are a fitness coach. The user has these undertrained muscle groups. " +
          "Suggest 3-5 specific exercises to bring these up, with brief reasoning. " +
          "Format: exercise name — one sentence why. Plain text only, no markdown.",
        messages: [
          {
            role: "user",
            content: `My undertrained muscle groups are: ${muscleList}. What exercises should I add to my program?`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { ok: false as const, error: "Could not generate suggestions." };

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text)
      .join(" ")
      .trim();

    if (!text) return { ok: false as const, error: "No response from the coach." };

    return { ok: true as const, suggestions: text };
  } catch {
    return { ok: false as const, error: "The coach is busy. Please try again." };
  }
}
