import Link from "next/link";
import { requireUser, getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { MedicationForm } from "@/components/tracking/medication-form";

export const metadata = { title: "Medication" };

export default async function MedicationPage() {
  const { user } = await requireUser();
  const { profile } = await getAuthContext();
  const supabase = await createClient();

  if (!profile?.medication_tracking_enabled) {
    return (
      <PageShell>
        <PageHeader title="Medication" />
        <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6">
          <p className="text-[var(--text-secondary)]">
            Medication &amp; wellbeing tracking is currently off. You can enable it
            in{" "}
            <Link href="/settings" className="text-[var(--accent-primary)]">
              Settings
            </Link>{" "}
            to track Mounjaro doses, injection sites and side effects alongside your
            training.
          </p>
        </div>
      </PageShell>
    );
  }

  const { data: logs } = await supabase
    .from("medication_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("taken_on", { ascending: false })
    .limit(30);

  const lastDose = logs?.[0];

  return (
    <PageShell>
      <PageHeader
        title="Medication"
        subtitle="Track doses, sites and side effects. This is a log, not medical advice."
      />

      {lastDose && (
        <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
            Last dose
          </p>
          <p className="mt-1 text-lg font-bold">
            {lastDose.medication_name}
            {lastDose.dose_mg ? ` · ${lastDose.dose_mg} mg` : ""}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            {new Date(lastDose.taken_on).toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
            {lastDose.injection_site ? ` · ${lastDose.injection_site}` : ""}
          </p>
        </div>
      )}

      <div className="mt-6">
        <MedicationForm />
      </div>

      {logs && logs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold">History</h2>
          <div className="mt-3 divide-y divide-[var(--border-subtle)] rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
            {logs.map((l) => (
              <div key={l.id} className="p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {l.medication_name}
                    {l.dose_mg ? ` · ${l.dose_mg} mg` : ""}
                  </span>
                  <span className="text-[var(--text-muted)]">
                    {new Date(l.taken_on).toLocaleDateString()}
                  </span>
                </div>
                {l.side_effects?.length > 0 && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Side effects: {l.side_effects.join(", ")}
                    {l.side_effect_severity != null
                      ? ` (severity ${l.side_effect_severity}/5)`
                      : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
