"use client";

import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────

export interface BodyCompositionScan {
  id: string;
  scan_date: string;
  source: string | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  water_pct: number | null;
  basal_metabolic_rate: number | null;
  bmi: number | null;
  visceral_fat_level: number | null;
  bone_mass_kg: number | null;
  protein_kg: number | null;
  left_arm_mass_kg: number | null;
  right_arm_mass_kg: number | null;
  trunk_mass_kg: number | null;
  left_leg_mass_kg: number | null;
  right_leg_mass_kg: number | null;
}

interface MetricCard {
  label: string;
  value: string | null;
  unit?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  inbody: "InBody",
  dexa: "DEXA",
  evolt: "Evolt",
  other: "Other",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmt(val: number | null, decimals = 1) {
  if (val === null || val === undefined) return null;
  return val.toFixed(decimals);
}

// ── Component ──────────────────────────────────────────────

export function BodyCompositionDisplay({
  scan,
}: {
  scan: BodyCompositionScan | null;
}) {
  if (!scan) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-primary)] py-12 text-center">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          No body composition scan uploaded yet
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Upload an InBody, DEXA, or Evolt scan to see your results here.
        </p>
      </div>
    );
  }

  const metrics: MetricCard[] = [
    { label: "Body Fat", value: fmt(scan.body_fat_pct), unit: "%" },
    { label: "Muscle Mass", value: fmt(scan.muscle_mass_kg), unit: "kg" },
    { label: "Water", value: fmt(scan.water_pct), unit: "%" },
    { label: "BMI", value: fmt(scan.bmi), unit: "" },
    { label: "BMR", value: fmt(scan.basal_metabolic_rate, 0), unit: "kcal" },
    {
      label: "Visceral Fat",
      value: fmt(scan.visceral_fat_level),
      unit: "lvl",
    },
    { label: "Bone Mass", value: fmt(scan.bone_mass_kg), unit: "kg" },
    { label: "Protein", value: fmt(scan.protein_kg), unit: "kg" },
  ];

  const segmental = [
    { label: "L. Arm", value: scan.left_arm_mass_kg },
    { label: "R. Arm", value: scan.right_arm_mass_kg },
    { label: "Trunk", value: scan.trunk_mass_kg },
    { label: "L. Leg", value: scan.left_leg_mass_kg },
    { label: "R. Leg", value: scan.right_leg_mass_kg },
  ];

  const segmentalValues = segmental.map((s) => s.value ?? 0);
  const maxSegmental = Math.max(...segmentalValues, 1);

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] p-5 pb-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Body Composition Scan
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {formatDate(scan.scan_date)}
            {scan.source && (
              <>
                {" · "}
                {SOURCE_LABELS[scan.source] ?? scan.source}
              </>
            )}
          </p>
        </div>
        {scan.weight_kg !== null && (
          <div className="text-right">
            <p className="text-lg font-bold text-[var(--accent-primary)]">
              {fmt(scan.weight_kg)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">kg</p>
          </div>
        )}
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-px bg-[var(--border-subtle)] sm:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-[var(--surface-primary)] p-4 text-center"
          >
            <p className="text-xs text-[var(--text-muted)]">{m.label}</p>
            <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
              {m.value ?? "—"}
              {m.value && m.unit && (
                <span className="ml-0.5 text-xs font-normal text-[var(--text-muted)]">
                  {m.unit}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Segmental muscle mass bars */}
      {segmental.some((s) => s.value !== null) && (
        <div className="border-t border-[var(--border-subtle)] p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Segmental Muscle Mass
          </p>
          <div className="space-y-2">
            {segmental.map((s) => {
              const val = s.value ?? 0;
              const pct = (val / maxSegmental) * 100;
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs text-[var(--text-secondary)]">
                    {s.label}
                  </span>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-[var(--surface-secondary)]">
                    <div
                      className={cn(
                        "h-full rounded-md bg-[var(--accent-primary)] transition-all"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs font-medium text-[var(--text-secondary)]">
                    {s.value !== null ? `${s.value.toFixed(2)} kg` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
