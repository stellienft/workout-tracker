interface ScanRow {
  scan_date?: string | null;
  source?: string | null;
  weight_kg?: number | null;
  body_fat_pct?: number | null;
  muscle_mass_kg?: number | null;
  water_pct?: number | null;
  basal_metabolic_rate?: number | null;
  bmi?: number | null;
  visceral_fat_level?: number | null;
  bone_mass_kg?: number | null;
  protein_kg?: number | null;
  [key: string]: unknown;
}

const METRICS: { key: keyof ScanRow; label: string; unit?: string }[] = [
  { key: "weight_kg", label: "Weight", unit: "kg" },
  { key: "body_fat_pct", label: "Body Fat", unit: "%" },
  { key: "muscle_mass_kg", label: "Muscle Mass", unit: "kg" },
  { key: "water_pct", label: "Water", unit: "%" },
  { key: "bmi", label: "BMI" },
  { key: "basal_metabolic_rate", label: "BMR", unit: "kcal" },
  { key: "visceral_fat_level", label: "Visceral Fat" },
  { key: "bone_mass_kg", label: "Bone Mass", unit: "kg" },
  { key: "protein_kg", label: "Protein", unit: "kg" },
];

/** Renders the latest body-composition scan as a grid of metric tiles. */
export function BodyCompCard({ scan }: { scan: ScanRow | null }) {
  if (!scan) return null;
  const shown = METRICS.filter((m) => scan[m.key] != null);
  if (shown.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Body Composition</h2>
        {(scan.source || scan.scan_date) && (
          <span className="text-xs text-[var(--text-muted)]">
            {scan.source ? String(scan.source).toUpperCase() : "Scan"}
            {scan.scan_date ? ` · ${new Date(scan.scan_date).toLocaleDateString()}` : ""}
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((m) => (
          <div
            key={String(m.key)}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-center"
          >
            <p className="text-lg font-bold">
              {Number(scan[m.key]).toFixed(m.unit === "kcal" ? 0 : 1)}
              {m.unit ? <span className="ml-0.5 text-xs font-medium text-[var(--text-muted)]">{m.unit}</span> : null}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
