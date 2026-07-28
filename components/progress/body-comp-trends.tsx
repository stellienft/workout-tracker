import { LineChart } from "@/components/ui/line-chart";

interface ScanRow {
  scan_date?: string | null;
  weight_kg?: number | null;
  body_fat_pct?: number | null;
  muscle_mass_kg?: number | null;
  bmi?: number | null;
  [key: string]: unknown;
}

const SERIES: { key: keyof ScanRow; label: string; unit: string }[] = [
  { key: "weight_kg", label: "Weight", unit: " kg" },
  { key: "body_fat_pct", label: "Body fat", unit: "%" },
  { key: "muscle_mass_kg", label: "Muscle mass", unit: " kg" },
  { key: "bmi", label: "BMI", unit: "" },
];

/**
 * Trend charts across a member's body-composition scans. Renders a chart for
 * each metric that has at least two readings — one snapshot is just the card.
 */
export function BodyCompTrends({ scans }: { scans: ScanRow[] }) {
  // Oldest → newest so the line reads left to right.
  const ordered = [...scans].sort((a, b) =>
    String(a.scan_date).localeCompare(String(b.scan_date))
  );

  const charts = SERIES.map((s) => {
    const data = ordered
      .filter((r) => r[s.key] != null && r.scan_date)
      .map((r) => ({ x: r.scan_date as string, y: Number(r[s.key]) }));
    return { ...s, data };
  }).filter((c) => c.data.length >= 2);

  if (charts.length === 0) return null;

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">Trends over time</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {charts.map((c) => (
          <div
            key={String(c.key)}
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5"
          >
            <LineChart data={c.data} label={c.label} unit={c.unit} height={180} />
          </div>
        ))}
      </div>
    </div>
  );
}
