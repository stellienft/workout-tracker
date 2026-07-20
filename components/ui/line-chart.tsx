"use client";

/**
 * Dependency-free SVG line chart with labelled axes. Brand-lime stroke with a
 * soft area fill, a labelled Y-axis (values), an X-axis (dates over time) and
 * light horizontal gridlines. Accessible: exposes an aria-label summarising
 * the trend.
 */
export function LineChart({
  data,
  height = 200,
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
  const m = { top: 10, right: 14, bottom: 26, left: 44 };
  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;

  const ys = data.map((d) => d.y);
  const rawMin = Math.min(...ys);
  const rawMax = Math.max(...ys);
  // Pad the range a little so the line doesn't sit on the top/bottom edge.
  const span = rawMax - rawMin || 1;
  const min = rawMin - span * 0.08;
  const max = rawMax + span * 0.08;
  const range = max - min || 1;

  const xFor = (i: number) =>
    m.left + (i / Math.max(data.length - 1, 1)) * plotW;
  const yFor = (v: number) => m.top + (1 - (v - min) / range) * plotH;

  const points = data.map((d, i) => [xFor(i), yFor(d.y)] as const);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");
  const area =
    `M ${points[0][0].toFixed(1)} ${m.top + plotH} ` +
    points.map((p) => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ") +
    ` L ${points[points.length - 1][0].toFixed(1)} ${m.top + plotH} Z`;

  const first = data[0].y;
  const last = data[data.length - 1].y;
  const delta = last - first;

  // Y-axis ticks (4 intervals across the padded range).
  const yTicks = Array.from({ length: 5 }, (_, i) => min + (range / 4) * i);

  // X-axis ticks: up to 5 evenly spaced dates across the series.
  const tickCount = Math.min(5, data.length);
  const spansYear =
    new Date(data[data.length - 1].x).getFullYear() !==
    new Date(data[0].x).getFullYear();
  const xTicks = Array.from({ length: tickCount }, (_, i) => {
    const idx =
      tickCount === 1
        ? 0
        : Math.round((i / (tickCount - 1)) * (data.length - 1));
    return { idx, x: xFor(idx), label: formatTick(data[idx].x, spansYear) };
  });

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
        aria-label={`${label ?? "Trend"}: from ${first}${unit} on ${formatTick(
          data[0].x,
          true
        )} to ${last}${unit} on ${formatTick(data[data.length - 1].x, true)}`}
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y gridlines + labels */}
        {yTicks.map((v, i) => {
          const y = yFor(v);
          return (
            <g key={i}>
              <line
                x1={m.left}
                y1={y}
                x2={width - m.right}
                y2={y}
                stroke="var(--border-subtle)"
                strokeWidth="1"
                opacity="0.5"
              />
              <text
                x={m.left - 6}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[var(--text-muted)]"
                style={{ fontSize: "11px" }}
              >
                {formatValue(v)}
                {unit}
              </text>
            </g>
          );
        })}

        {/* X labels + ticks */}
        {xTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={t.x}
              y1={m.top + plotH}
              x2={t.x}
              y2={m.top + plotH + 4}
              stroke="var(--border-subtle)"
              strokeWidth="1"
            />
            <text
              x={t.x}
              y={m.top + plotH + 17}
              textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
              className="fill-[var(--text-muted)]"
              style={{ fontSize: "11px" }}
            >
              {t.label}
            </text>
          </g>
        ))}

        <path d={area} fill="url(#areaFill)" />
        <path
          d={path}
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="var(--accent-primary)" />
        ))}
      </svg>
    </div>
  );
}

function formatValue(v: number) {
  // Whole numbers when close, else one decimal.
  return Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1);
}

function formatTick(iso: string, withYear: boolean) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "2-digit" } : {}),
  });
}
