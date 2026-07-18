import { requireUser, getAuthContext } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { SettingsForm } from "@/components/settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireUser();
  const { profile } = await getAuthContext();

  return (
    <PageShell>
      <PageHeader title="Settings" subtitle="Preferences and account." />
      <div className="mt-6">
        <SettingsForm
          initial={{
            fullName: profile?.full_name ?? "",
            unitPreference: profile?.unit_preference ?? "metric",
            hapticsEnabled: profile?.haptics_enabled ?? true,
            medicationTracking: profile?.medication_tracking_enabled ?? false,
            considerations: profile?.considerations ?? "",
          }}
        />
      </div>
    </PageShell>
  );
}
