interface ScanRow {
  scan_date?: string | null;
  weight_kg?: number | null;
  body_fat_pct?: number | null;
  fat_mass_kg?: number | null;
  lean_mass_kg?: number | null;
  muscle_mass_kg?: number | null;
  [key: string]: unknown;
}

interface Bar {
  date: string;
  weight: number;
  fat: number;
  lean: number;
  bf: number | null;
}

function toBar(s: ScanRow): Bar | null {
  const w = s.weight_kg != null ? Number(s.weight_kg) : null;
  if (w == null || w <= 0) return null;
  const bf = s.body_fat_pct != null ? Number(s.body_fat_pct) : null;
  const fat =
    s.fat_mass_kg != null ? Number(s.fat_mass_kg) : bf != null ? (w * bf) / 100 : null;
  if (fat == null) return null;
  const lean =
    s.lean_mass_kg != null ? Number(s.lean_mass_kg) : Math.max(0, w - fat);
  return { date: String(s.scan_date ?? ""), weight: w, fat, lean, bf };
}

/**
 * "Shape trend": one stacked bar per scan showing how total weight splits into
 * lean mass (accent) and fat mass (red) — the standard DEXA/InBody way to see
 * recomposition. Newest scans on the right.
 */
export function BodyCompositionChart({ scans }: { scans: ScanRow[] }) {
  const bars = [...scans]
    .map(toBar)
    .filter((b): b is Bar => b !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10);
  if (bars.length === 0) return null;

  const maxW = Math.ceil(Math.max(...bars.map((b) => b.weight)) / 10) * 10 || 10;
  const topPad = 18;
  const bottomPad = 34;
  const leftPad = 34;
  const rightPad = 10;
  const innerH = 190;
  const chartH = topPad + innerH + bottomPad;
  const barW = 30;
  const gap = 20;
  const width = leftPad + bars.length * (barW + gap) + rightPad;
  const y = (v: number) => topPad + innerH * (1 - v / maxW);
  const latest = bars[bars.length - 1];
  const ticks = [0, maxW / 2, maxW];

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Composition over time</h3>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            How your weight splits into lean mass and fat.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--accent-primary)]" /> Lean
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--fat)]" /> Fat
          </span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${chartH}`}
          width={width}
          height={chartH}
          className="max-w-full"
          role="img"
          aria-label="Body composition over time"
        >
          {/* gridlines + y labels (kg) */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={leftPad}
                x2={width - rightPad}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--border-subtle)"
                strokeWidth="1"
              />
              <text
                x={leftPad - 6}
                y={y(t) + 3}
                textAnchor="end"
                className="fill-[var(--text-muted)]"
                style={{ fontSize: 9 }}
              >
                {Math.round(t)}
              </text>
            </g>
          ))}

          {bars.map((b, i) => {
            const x = leftPad + i * (barW + gap);
            const leanH = innerH * (b.lean / maxW);
            const fatH = innerH * (b.fat / maxW);
            const leanY = topPad + innerH - leanH;
            const fatY = leanY - fatH;
            const d = b.date ? new Date(b.date) : null;
            const label = d
              ? d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
              : "";
            return (
              <g key={i}>
                {/* fat (top) */}
                <rect x={x} y={fatY} width={barW} height={fatH} rx="2" fill="var(--fat)" />
                {/* lean (bottom) */}
                <rect
                  x={x}
                  y={leanY}
                  width={barW}
                  height={leanH}
                  rx="2"
                  fill="var(--accent-primary)"
                />
                {/* total weight atop */}
                <text
                  x={x + barW / 2}
                  y={fatY - 5}
                  textAnchor="middle"
                  className="fill-[var(--text-secondary)]"
                  style={{ fontSize: 9, fontWeight: 600 }}
                >
                  {b.weight.toFixed(0)}
                </text>
                {/* date */}
                <text
                  x={x + barW / 2}
                  y={chartH - 16}
                  textAnchor="middle"
                  className="fill-[var(--text-muted)]"
                  style={{ fontSize: 9 }}
                >
                  {label}
                </text>
                {b.bf != null && (
                  <text
                    x={x + barW / 2}
                    y={chartH - 4}
                    textAnchor="middle"
                    className="fill-[var(--text-muted)]"
                    style={{ fontSize: 8.5 }}
                  >
                    {b.bf.toFixed(0)}% BF
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Latest split summary */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Cell label="Total" value={`${latest.weight.toFixed(1)} kg`} />
        <Cell label="Lean" value={`${latest.lean.toFixed(1)} kg`} tone="accent" />
        <Cell label="Fat" value={`${latest.fat.toFixed(1)} kg`} tone="fat" />
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent" | "fat";
}) {
  const color =
    tone === "accent"
      ? "text-[var(--accent-primary)]"
      : tone === "fat"
        ? "text-[var(--fat)]"
        : "text-[var(--text-primary)]";
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3">
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
