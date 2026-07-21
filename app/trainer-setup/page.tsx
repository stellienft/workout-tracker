import { redirect } from "next/navigation";
import { getAuthContext, isTrainerRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TrainerSetupWizard } from "@/components/trainer/setup-wizard";

export const metadata = { title: "Trainer setup" };

export default async function TrainerSetupPage() {
  const { user, profile, roles } = await getAuthContext();
  if (!user) redirect("/login");
  // Non-trainers use the standard member onboarding.
  if (!isTrainerRole(roles)) redirect("/onboarding");
  // Already set up — go straight to the portal.
  if (profile?.onboarding_completed) redirect("/trainer");

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, tagline, accent_color, logo_url")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  const suggestedName =
    tenant?.name ||
    (profile?.full_name ? `${profile.full_name.split(" ")[0]}'s Coaching` : "");

  return (
    <main className="min-h-dvh bg-[var(--background-primary)]">
      <TrainerSetupWizard
        name={profile?.full_name ?? ""}
        initial={{
          businessName: suggestedName,
          tagline: tenant?.tagline ?? "",
          accentColor: tenant?.accent_color ?? "#ccff30",
          logoUrl: tenant?.logo_url ?? "",
        }}
      />
    </main>
  );
}
