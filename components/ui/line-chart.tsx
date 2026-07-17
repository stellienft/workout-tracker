"use client";

/**
 * Dependency-free SVG line chart. Brand-lime stroke with a soft area fill.
 * Accessible: exposes an aria-label summarising the trend.
 */
export function LineChart({
  data,
  height = 160,
  label,
  unit = "",
}: {
  data: { x: string; y: number }[];
  height?: number;
  label?: string;
  unit?: string;
}) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-sm text-[var(--text-muted)]"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  const width = 600;
  const pad = 12;
  const ys = data.map((d) => d.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (width - pad * 2);
    const y = pad + (1 - (d.y - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");
  const area =
    `M ${points[0][0].toFixed(1)} ${height - pad} ` +
    points.map((p) => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ") +
    ` L ${points[points.length - 1][0].toFixed(1)} ${height - pad} Z`;

  const first = data[0].y;
  const last = data[data.length - 1].y;
  const delta = last - first;

  return (
    <div>
      {label && (
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-[var(--text-secondary)]">{label}</span>
          <span className="text-sm">
            <span className="font-bold">
              {last}
              {unit}
            </span>{" "}
            <span
              className={
                delta === 0
                  ? "text-[var(--text-muted)]"
                  : delta < 0
                    ? "text-[var(--accent-primary)]"
                    : "text-[var(--text-secondary)]"
              }
            >
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)}
              {unit}
            </span>
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`${label ?? "Trend"}: from ${first}${unit} to ${last}${unit}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#areaFill)" />
        <path
          d={path}
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="var(--accent-primary)" />
        ))}
      </svg>
    </div>
  );
}
