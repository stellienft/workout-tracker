"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyAdminNewMember } from "@/lib/email";

const onboardingSchema = z.object({
  goalId: z.string().uuid(),
  age: z.coerce.number().int().min(13).max(100).optional(),
  trainingHistory: z
    .enum(["never", "lt_6m", "6_12m", "1_3y", "3y_plus", "returning"])
    .optional(),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  trainingLocation: z.enum(["home", "gym", "both"]).optional(),
  weeklyFrequency: z.coerce.number().int().min(1).max(7),
  sessionMinutes: z.coerce.number().int().min(10).max(180),
  equipment: z.array(z.string()).default([]),
  injuryAreas: z.array(z.string()).max(20).default([]),
  considerations: z.string().max(1000).optional().default(""),
  trainingDays: z.array(z.string()).default([]),
  medicationTracking: z.boolean().default(false),
  glp1: z.boolean().default(false),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;

export async function completeOnboarding(raw: OnboardingInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // Save the profile answers.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      onboarding_completed: true,
      age: data.age ?? null,
      training_history: data.trainingHistory ?? null,
      experience_level: data.experience,
      weekly_frequency: data.weeklyFrequency,
      session_minutes: data.sessionMinutes,
      equipment: data.equipment,
      training_days: data.trainingDays,
      injury_areas: data.injuryAreas,
      considerations: data.considerations,
      // GLP-1 users get the Health tab on by default so they can log doses.
      medication_tracking_enabled: data.medicationTracking || data.glp1,
    })
    .eq("id", user.id);
  if (profileError) return { ok: false, error: profileError.message };

  // training_location is added by a later migration — write it best-effort so a
  // not-yet-migrated database can't break onboarding. supabase-js returns the
  // error rather than throwing, so we simply ignore it.
  if (data.trainingLocation) {
    await supabase
      .from("profiles")
      .update({ training_location: data.trainingLocation })
      .eq("id", user.id);
  }

  // glp1_medication is a later migration too — best-effort so onboarding never
  // fails on a not-yet-migrated database.
  if (data.glp1) {
    await supabase
      .from("profiles")
      .update({ glp1_medication: true })
      .eq("id", user.id);
  }

  // Clear any prior primary flag, then set the chosen goal as primary.
  await supabase
    .from("user_goals")
    .update({ is_primary: false })
    .eq("user_id", user.id);

  const { error: goalError } = await supabase.from("user_goals").upsert(
    {
      user_id: user.id,
      fitness_goal_id: data.goalId,
      is_primary: true,
      selected_at: new Date().toISOString(),
    },
    { onConflict: "user_id,fitness_goal_id" }
  );
  if (goalError) return { ok: false, error: goalError.message };

  // Notify the admin that a new member has joined. Best-effort: a failure
  // here must never block the member from finishing onboarding.
  try {
    const [{ data: goal }, { data: profile }] = await Promise.all([
      supabase.from("fitness_goals").select("name").eq("id", data.goalId).maybeSingle(),
      supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    ]);
    await notifyAdminNewMember({
      email: profile?.email ?? user.email ?? "unknown",
      name: profile?.full_name,
      goal: goal?.name,
      experience: data.experience,
      weeklyFrequency: data.weeklyFrequency,
    });
  } catch (err) {
    console.error("[onboarding] admin notification failed", err);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export interface RecommendedProgram {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  cover_image_path: string | null;
  experience_level: string;
  duration_weeks: number;
  minimum_days_per_week: number;
  maximum_days_per_week: number;
  estimated_session_minutes: number;
}

const HOME_RE = /home|bodyweight|dumbbell|no equipment|no-equipment/i;

/**
 * Recommend a few published programs that fit the member's goal, fitness level
 * and where they train (home vs gym). Scored, not filtered, so it always
 * returns something sensible.
 */
export async function recommendProgramsForOnboarding(input: {
  goalId?: string | null;
  experience?: "beginner" | "intermediate" | "advanced";
  location?: "home" | "gym" | "both";
  glp1?: boolean;
}): Promise<RecommendedProgram[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select(
      "id, name, slug, short_description, cover_image_path, fitness_goal_id, experience_level, duration_weeks, minimum_days_per_week, maximum_days_per_week, estimated_session_minutes, featured"
    )
    .eq("status", "published")
    .limit(200);

  const order = { beginner: 0, intermediate: 1, advanced: 2, all: 1 } as const;
  const userLvl = order[input.experience ?? "beginner"];

  const scored = (data ?? []).map((p) => {
    let score = 0;
    if (input.goalId && p.fitness_goal_id === input.goalId) score += 5;

    const lvl = (p.experience_level as string) ?? "all";
    if (lvl === input.experience) score += 3;
    else if (lvl === "all") score += 1;
    else {
      // Penalise by how far the program level is from the member's.
      const dist = Math.abs((order[lvl as keyof typeof order] ?? 1) - userLvl);
      score += dist === 1 ? 0 : -2;
    }

    const homeFriendly = HOME_RE.test(`${p.name} ${p.short_description ?? ""} ${p.slug}`);
    if (input.location === "home") score += homeFriendly ? 5 : -4;
    else if (input.location === "gym") score += homeFriendly ? -1 : 2;

    // For GLP-1 members, strongly favour the GLP-1-specific programs.
    if (input.glp1 && (p.slug as string).startsWith("glp1-")) score += 6;

    if (p.featured) score += 0.5;
    return { p, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
    .slice(0, 4)
    .map(({ p }) => ({
      id: p.id as string,
      name: p.name as string,
      slug: p.slug as string,
      short_description: (p.short_description as string | null) ?? null,
      cover_image_path: (p.cover_image_path as string | null) ?? null,
      experience_level: (p.experience_level as string) ?? "all",
      duration_weeks: (p.duration_weeks as number) ?? 0,
      minimum_days_per_week: (p.minimum_days_per_week as number) ?? 0,
      maximum_days_per_week: (p.maximum_days_per_week as number) ?? 0,
      estimated_session_minutes: (p.estimated_session_minutes as number) ?? 0,
    }));
}

/** Change the primary goal later (from Goals page). */
export async function setPrimaryGoal(goalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  await supabase
    .from("user_goals")
    .update({ is_primary: false })
    .eq("user_id", user.id);

  const { error } = await supabase.from("user_goals").upsert(
    {
      user_id: user.id,
      fitness_goal_id: goalId,
      is_primary: true,
      selected_at: new Date().toISOString(),
    },
    { onConflict: "user_id,fitness_goal_id" }
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true };
}
