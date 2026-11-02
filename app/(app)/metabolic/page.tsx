import { requireUser } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { planAllows } from "@/lib/plan";
import { UpgradeWall } from "@/components/billing/upgrade-wall";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { LineChart } from "@/components/ui/line-chart";
import { getMetabolicData, type BandStatus } from "@/lib/metabolic";
import { MarkerForm } from "@/components/metabolic/marker-form";
import { MetabolicSettings } from "@/components/metabolic/metabolic-settings";
import { ManagementGuide } from "@/components/metabolic/management-guide";
import { EntryList } from "@/components/metabolic/entry-list";

export const metadata = { title: "Metabolic Health" };

const STATUS_STYLE: Record<BandStatus, { card: string; pill: string; dot: string }> = {
  good: {
    card: "border-emerald-500/30",
    pill: "bg-emerald-500/15 text-emerald-400",
    dot: "bg-emerald-400",
  },
  watch: {
    card: "border-amber-500/30",
    pill: "bg-amber-500/15 text-amber-400",
    dot: "bg-amber-400",
  },
  high: {
    card: "border-red-500/30",
    pill: "bg-red-500/15 text-red-400",
    dot: "bg-red-400",
  },
  unknown: {
    card: "border-[var(--border-subtle)]",
    pill: "bg-[var(--surface-secondary)] text-[var(--text-muted)]",
    dot: "bg-[var(--text-muted)]",
  },
};

const STATUS_LABEL: Record<BandStatus, string> = {
  good: "Good",
  watch: "Watch",
  high: "High",
  unknown: "No data",
};

const TRENDS: { key: string; label: string; unit: string }[] = [
  { key: "homa_ir", label: "HOMA-IR", unit: "" },
  { key: "glucose", label: "Fasting glucose", unit: " mmol/L" },
  { key: "hba1c", label: "HbA1c", unit: "%" },
  { key: "tg_hdl", label: "TG : HDL", unit: "" },
];

export default async function MetabolicPage() {
  const { user } = await requireUser();
  const { plan } = await getUserPlan();
  if (!planAllows(plan, "health")) return <UpgradeWall feature="health" />;

  const data = await getMetabolicData(user.id);
  const hasAny = data.entries.length > 0;

  return (
    <PageShell>
      <PageHeader
        title="Metabolic Health"
        subtitle="Track insulin-resistance markers and see what's driving them. Educational tracking — not a diagnosis or medical advice."
      />

      <div className="mt-6">
        <MetabolicSettings
          heightCm={data.heightCm}
          remindersEnabled={data.remindersEnabled}
        />
      </div>

      {/* Index + marker cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {data.readings.map((r) => {
          const s = STATUS_STYLE[r.status];
          return (
            <div
              key={r.key}
              className={`rounded-[var(--radius-card)] border ${s.card} bg-[var(--surface-primary)] p-4`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  {r.label}
                </p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.pill}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold tabular-nums">
                {r.display}
                <span className="text-sm font-medium text-[var(--text-muted)]">
                  {r.value != null ? r.unit : ""}
                </span>
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{r.note}</p>
            </div>
          );
        })}
      </div>

      {/* Add results */}
      <div className="mt-4">
        <MarkerForm />
      </div>

      {/* Trends */}
      {hasAny && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">Trends</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {TRENDS.map((t) => {
              const s = data.series[t.key] ?? [];
              if (s.length < 2) return null;
              return (
                <div
                  key={t.key}
                  className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
                >
                  <LineChart data={s} label={t.label} unit={t.unit} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <ManagementGuide />

      <EntryList entries={data.entries} />

      <p className="mt-8 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 text-xs leading-relaxed text-[var(--text-muted)]">
        Reference ranges shown are general guides for adults and vary between
        labs and individuals — they are not a diagnosis. HOMA-IR = fasting
        glucose (mmol/L) × fasting insulin (µU/mL) ÷ 22.5. Discuss your results,
        and any changes to medication or treatment, with your GP or
        endocrinologist — especially if you take glucose-lowering or GLP-1
        medication.
      </p>
    </PageShell>
  );
}
