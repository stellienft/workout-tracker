import { redirect } from "next/navigation";
import { getAuthContext, isTrainerRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import type { FitnessGoal } from "@/lib/types";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const { user, profile, roles } = await getAuthContext();
  if (!user) redirect("/login");
  // Trainers use the trainer setup flow, not the member goal onboarding.
  if (isTrainerRole(roles)) {
    redirect(profile?.onboarding_completed ? "/trainer" : "/trainer-setup");
  }
  if (profile?.onboarding_completed) redirect("/dashboard");

  const supabase = await createClient();
  const { data: goals } = await supabase
    .from("fitness_goals")
    .select("*")
    .eq("active", true)
    .order("display_order");

  return (
    <main className="min-h-dvh bg-[var(--background-primary)]">
      <OnboardingWizard
        goals={(goals ?? []) as FitnessGoal[]}
        name={profile?.full_name ?? ""}
      />
    </main>
  );
}
