import Link from "next/link";
import { requireUser, getAuthContext } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { planAllows } from "@/lib/plan";
import { UpgradeWall } from "@/components/billing/upgrade-wall";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { HealthPanel } from "@/components/tracking/health-panel";
import { MedicationForm } from "@/components/tracking/medication-form";
import { MedicationHistory } from "@/components/tracking/medication-history";
import { getHealthData } from "@/lib/health";
import { Glp1Insights } from "@/components/health/glp1-insights";
import { buildGlp1Data } from "@/lib/glp1";
import { DEFAULT_TZ } from "@/lib/timezone";

export const metadata = { title: "Health" };

export default async function HealthPage() {
  const { user } = await requireUser();
  const { plan } = await getUserPlan();
  if (!planAllows(plan, "health")) return <UpgradeWall feature="health" />;

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

  const [health, { data: medLogs }, { data: weightRows }] = await Promise.all([
    getHealthData(user.id),
    supabase
      .from("medication_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("taken_on", { ascending: false })
      .limit(60),
    supabase
      .from("body_metrics")
      .select("recorded_on, weight_kg")
      .eq("user_id", user.id)
      .order("recorded_on", { ascending: true })
      .limit(1000),
  ]);

  const lastDose = medLogs?.[0];
  const tz = profile?.timezone || DEFAULT_TZ;

  // GLP-1 companion: weekly-dose reminder, weight-loss journey, dose + side
  // effect trends. Only shows for members logging a recognised GLP-1 med.
  const glp1 = buildGlp1Data(
    medLogs ?? [],
    weightRows ?? [],
    tz,
    profile?.goal_weight_kg ?? null
  );

  // Recent injection sites (most-recent-first) power the rotation suggestion.
  const recentSites = (medLogs ?? [])
    .map((l) => l.injection_site as string | null)
    .filter((s): s is string => !!s)
    .slice(0, 8);

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

      {/* GLP-1 companion insights */}
      {glp1 && <Glp1Insights data={glp1} />}

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
              {new Date(`${lastDose.taken_on}T12:00:00`).toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
              {lastDose.injection_site ? ` · ${lastDose.injection_site}` : ""}
            </p>
          </div>
        )}

        <div className="mt-4">
          <MedicationForm recentSites={recentSites} />
        </div>

        {medLogs && medLogs.length > 0 && (
          <MedicationHistory
            logs={medLogs.map((l) => ({
              id: l.id as string,
              medication_name: l.medication_name as string,
              dose_mg: (l.dose_mg as number | null) ?? null,
              taken_on: l.taken_on as string,
              injection_site: (l.injection_site as string | null) ?? null,
              side_effects: (l.side_effects as string[] | null) ?? null,
              side_effect_severity: (l.side_effect_severity as number | null) ?? null,
              notes: (l.notes as string | null) ?? null,
            }))}
            recentSites={recentSites}
          />
        )}
      </section>
    </PageShell>
  );
}
