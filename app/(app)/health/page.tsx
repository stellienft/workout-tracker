import Link from "next/link";
import { requireUser, getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { HealthPanel } from "@/components/tracking/health-panel";
import { MedicationForm } from "@/components/tracking/medication-form";
import { getHealthData } from "@/lib/health";

export const metadata = { title: "Health" };

export default async function HealthPage() {
  const { user } = await requireUser();
  const { profile } = await getAuthContext();
  const supabase = await createClient();

  if (!profile?.medication_tracking_enabled) {
    return (
      <PageShell>
        <PageHeader title="Health" />
        <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6">
          <p className="text-[var(--text-secondary)]">
            Health &amp; symptom tracking is currently off. Turn it on in{" "}
            <Link href="/settings" className="text-[var(--accent-primary)]">
              Settings
            </Link>{" "}
            to track the symptoms, vitals and medications that matter to you
            alongside your training.
          </p>
        </div>
      </PageShell>
    );
  }

  const [health, { data: medLogs }] = await Promise.all([
    getHealthData(user.id),
    supabase
      .from("medication_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("taken_on", { ascending: false })
      .limit(20),
  ]);

  const lastDose = medLogs?.[0];

  return (
    <PageShell>
      <PageHeader
        title="Health"
        subtitle="Track the symptoms, vitals and medications that matter to you. This is a personal log, not medical advice."
      />

      <div className="mt-6">
        {health.catalog.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 text-sm text-[var(--text-secondary)]">
            Symptom tracking is being set up — check back shortly. You can still
            log medications below.
          </div>
        ) : (
          <HealthPanel
            trackers={health.trackers}
            catalog={health.catalog}
            enabledMetricIds={Array.from(health.enabledMetricIds)}
          />
        )}
      </div>

      {/* Medications */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">Medications</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Log any medication — dose, injection site and side effects.
        </p>

        {lastDose && (
          <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
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

        <div className="mt-4">
          <MedicationForm />
        </div>

        {medLogs && medLogs.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold">History</h3>
            <div className="mt-3 divide-y divide-[var(--border-subtle)] rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
              {medLogs.map((l) => (
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
      </section>
    </PageShell>
  );
}
