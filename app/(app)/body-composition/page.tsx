import Link from "next/link";
import { Printer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/entitlements";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { BodyScanUpload } from "@/components/progress/body-scan-upload";
import { BodyCompCard } from "@/components/progress/body-comp-card";
import { BodyCompTrends } from "@/components/progress/body-comp-trends";
import { ScanPlanCard, type RecoProgram } from "@/components/progress/scan-plan-card";
import { SegmentBalance } from "@/components/progress/segment-balance";
import { GoalProjection } from "@/components/progress/goal-projection";
import type { ScanPlan } from "@/lib/actions/body-composition";

export const metadata = { title: "Body Composition" };

export default async function BodyCompositionPage() {
  const { user } = await requireUser();
  const supabase = await createClient();
  const { isPro } = await getUserPlan();

  const [{ data: prof }, { data: metrics }, { data: scanRows }] = await Promise.all([
    supabase.from("profiles").select("goal_weight_kg").eq("id", user.id).maybeSingle(),
    supabase
      .from("body_metrics")
      .select("recorded_on, weight_kg")
      .eq("user_id", user.id)
      .not("weight_kg", "is", null)
      .order("recorded_on", { ascending: true })
      .limit(1000),
    supabase
      .from("body_composition_scans")
      .select("*")
      .eq("user_id", user.id)
      .order("scan_date", { ascending: false })
      .limit(60),
  ]);

  const scans = (scanRows ?? []) as Record<string, unknown>[];
  const latestScan = scans[0] ?? null;

  const latestPlan = (latestScan as { ai_plan?: ScanPlan | null })?.ai_plan ?? null;
  const recoSlugs = latestPlan?.recommendedPrograms ?? [];
  const [{ data: recoRows }, { data: coachLink }] = await Promise.all([
    recoSlugs.length
      ? supabase
          .from("programs")
          .select("slug, name, experience_level")
          .in("slug", recoSlugs)
          .eq("status", "published")
      : Promise.resolve({ data: [] as RecoProgram[] }),
    supabase
      .from("trainer_clients")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
  ]);
  const recoMap = new Map((recoRows ?? []).map((p) => [p.slug as string, p as RecoProgram]));
  const recommendedPrograms = recoSlugs
    .map((s) => recoMap.get(s))
    .filter((p): p is RecoProgram => !!p);
  const hasCoach = Boolean(coachLink);

  const weeksSinceScan = latestScan?.scan_date
    ? Math.floor((Date.now() - new Date(String(latestScan.scan_date)).getTime()) / (7 * 86_400_000))
    : null;

  // Weekly rate of weight change for the goal projection.
  const weightPts = (metrics ?? []).map((m) => ({
    t: new Date(String(m.recorded_on)).getTime(),
    w: Number(m.weight_kg),
  }));
  const currentWeight =
    (latestScan?.weight_kg != null ? Number(latestScan.weight_kg) : null) ??
    (weightPts.length ? weightPts[weightPts.length - 1].w : null);
  let weeklyRate: number | null = null;
  const recent = weightPts.filter((p) => p.t >= Date.now() - 56 * 86_400_000);
  const base = recent.length >= 2 ? recent : weightPts.length >= 2 ? weightPts : [];
  if (base.length >= 2) {
    const weeks = (base[base.length - 1].t - base[0].t) / (7 * 86_400_000);
    if (weeks >= 0.5) weeklyRate = (base[base.length - 1].w - base[0].w) / weeks;
  }
  const goalWeight = (prof?.goal_weight_kg as number | null) ?? null;

  const fmtDate = (v: unknown) =>
    v ? new Date(String(v)).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "";

  return (
    <PageShell>
      <PageHeader
        title="Body Composition"
        subtitle="Your DEXA / InBody scans, trends and AI training focus."
      />

      {!latestScan ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] p-8 text-center">
            <p className="text-lg font-bold">Add your first scan</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-secondary)]">
              Upload a DEXA, InBody or Evolt scan (photo, PDF or pasted text). We&apos;ll
              read every metric, chart your trends, and build a training focus around it.
            </p>
          </div>
          <BodyScanUpload isPro={isPro} />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {weeksSinceScan != null && weeksSinceScan >= 10 && (
            <div className="rounded-[var(--radius-card)] border border-[var(--border-active)] bg-[var(--accent-muted)] px-4 py-3 text-sm">
              It&apos;s been <span className="font-semibold">{weeksSinceScan} weeks</span> since your
              last scan — a fresh one keeps your comparisons and plan on track.
            </div>
          )}

          <BodyCompCard
            scan={latestScan as Record<string, unknown>}
            prev={(scans[1] as Record<string, unknown>) ?? null}
          />
          <GoalProjection currentWeight={currentWeight} goalWeight={goalWeight} weeklyRate={weeklyRate} />
          <SegmentBalance scan={latestScan as Record<string, unknown>} />
          <ScanPlanCard
            scanId={(latestScan as { id: string }).id}
            initialPlan={latestPlan}
            generatedAt={((latestScan as { ai_plan_generated_at?: string | null }).ai_plan_generated_at) ?? null}
            isPro={isPro}
            recommendedPrograms={recommendedPrograms}
            hasCoach={hasCoach}
            printHref={`/scan-report/${(latestScan as { id: string }).id}`}
          />

          {scans.length >= 2 && <BodyCompTrends scans={scans} />}

          {/* Scan history */}
          <section>
            <h2 className="mb-3 mt-2 text-lg font-bold">Scan history</h2>
            <div className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
              {scans.map((s) => (
                <div key={String(s.id)} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {s.source ? String(s.source).toUpperCase() : "Scan"} · {fmtDate(s.scan_date)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {[
                        s.weight_kg != null ? `${Number(s.weight_kg).toFixed(1)} kg` : null,
                        s.body_fat_pct != null ? `${Number(s.body_fat_pct).toFixed(1)}% BF` : null,
                        s.lean_mass_kg != null
                          ? `${Number(s.lean_mass_kg).toFixed(1)} kg lean`
                          : s.muscle_mass_kg != null
                            ? `${Number(s.muscle_mass_kg).toFixed(1)} kg lean`
                            : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Link
                    href={`/scan-report/${String(s.id)}`}
                    target="_blank"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Printer className="h-3.5 w-3.5" /> Report
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <div className="pt-2">
            <BodyScanUpload isPro={isPro} />
          </div>
        </div>
      )}
    </PageShell>
  );
}
