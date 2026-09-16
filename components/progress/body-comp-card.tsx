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
  { key: "fat_mass_kg", label: "Fat Mass", unit: "kg" },
  { key: "lean_mass_kg", label: "Lean Mass", unit: "kg" },
  { key: "muscle_mass_kg", label: "Muscle Mass", unit: "kg" },
  { key: "bone_mineral_kg", label: "Bone Mineral", unit: "kg" },
  { key: "bone_mass_kg", label: "Bone Mass", unit: "kg" },
  { key: "vat_mass_kg", label: "Visceral Fat", unit: "kg" },
  { key: "visceral_fat_level", label: "Visceral Fat" },
  { key: "android_fat_pct", label: "Android Fat", unit: "%" },
  { key: "gynoid_fat_pct", label: "Gynoid Fat", unit: "%" },
  { key: "water_pct", label: "Water", unit: "%" },
  { key: "bmi", label: "BMI" },
  { key: "basal_metabolic_rate", label: "BMR", unit: "kcal" },
  { key: "protein_kg", label: "Protein", unit: "kg" },
];

// For which metrics is a decrease the "good" direction? (lower body fat,
// visceral fat and BMI are improvements; muscle/protein up is the win; the
// rest are shown neutral.)
const LOWER_BETTER = new Set(["body_fat_pct", "visceral_fat_level", "bmi"]);
const HIGHER_BETTER = new Set(["muscle_mass_kg", "protein_kg"]);

/** Renders the latest body-composition scan as a grid of metric tiles, with the
 *  change since the previous scan when one exists. */
export function BodyCompCard({
  scan,
  prev,
}: {
  scan: ScanRow | null;
  prev?: ScanRow | null;
}) {
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
      {prev?.scan_date && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Change vs {new Date(prev.scan_date).toLocaleDateString()}
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((m) => {
          const cur = Number(scan[m.key]);
          const before = prev && prev[m.key] != null ? Number(prev[m.key]) : null;
          const diff = before != null ? cur - before : null;
          const dp = m.unit === "kcal" ? 0 : 1;
          let tone = "text-[var(--text-muted)]";
          if (diff != null && Math.abs(diff) >= (m.unit === "kcal" ? 1 : 0.05)) {
            const good =
              (LOWER_BETTER.has(String(m.key)) && diff < 0) ||
              (HIGHER_BETTER.has(String(m.key)) && diff > 0);
            const bad =
              (LOWER_BETTER.has(String(m.key)) && diff > 0) ||
              (HIGHER_BETTER.has(String(m.key)) && diff < 0);
            tone = good
              ? "text-[var(--accent-primary)]"
              : bad
                ? "text-[var(--danger)]"
                : "text-[var(--text-secondary)]";
          }
          return (
            <div
              key={String(m.key)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-center"
            >
              <p className="text-lg font-bold tabular-nums">
                {cur.toFixed(dp)}
                {m.unit ? <span className="ml-0.5 text-xs font-medium text-[var(--text-muted)]">{m.unit}</span> : null}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">{m.label}</p>
              {diff != null && Math.abs(diff) >= (m.unit === "kcal" ? 1 : 0.05) && (
                <p className={`mt-0.5 text-[10px] font-semibold tabular-nums ${tone}`}>
                  {diff > 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(dp)}
                  {m.unit ?? ""}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
