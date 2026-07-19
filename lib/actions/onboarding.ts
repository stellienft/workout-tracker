"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyAdminNewMember } from "@/lib/email";

const onboardingSchema = z.object({
  goalId: z.string().uuid(),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  weeklyFrequency: z.coerce.number().int().min(1).max(7),
  sessionMinutes: z.coerce.number().int().min(10).max(180),
  equipment: z.array(z.string()).default([]),
  considerations: z.string().max(1000).optional().default(""),
  trainingDays: z.array(z.string()).default([]),
  medicationTracking: z.boolean().default(false),
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
      experience_level: data.experience,
      weekly_frequency: data.weeklyFrequency,
      session_minutes: data.sessionMinutes,
      equipment: data.equipment,
      training_days: data.trainingDays,
      considerations: data.considerations,
      medication_tracking_enabled: data.medicationTracking,
    })
    .eq("id", user.id);
  if (profileError) return { ok: false, error: profileError.message };

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
