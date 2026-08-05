"use client";

import { useMemo, useRef, useState } from "react";

/**
 * Dependency-free multi-series SVG line chart. One line per entity (e.g. an
 * exercise), coloured from the validated categorical series ramp
 * (--series-1…8), on a single shared value axis and a shared time axis. A
 * legend names every series (identity is never colour-alone) and shows each
 * one's current value + change; a touch/hover crosshair reads out every
 * series at the nearest session date.
 */
export interface ChartSeries {
  name: string;
  /** CSS colour, typically `var(--series-N)`. */
  color: string;
  /** Points sorted ascending by time (ms epoch). */
  points: { t: number; y: number }[];
}

export function MultiLineChart({
  series,
  unit = "",
  height = 280,
}: {
  series: ChartSeries[];
  unit?: string;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeT, setActiveT] = useState<number | null>(null);

  const width = 640;
  const m = { top: 14, right: 16, bottom: 28, left: 46 };
  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;

  const model = useMemo(() => {
    const allY = series.flatMap((s) => s.points.map((p) => p.y));
    const allT = series.flatMap((s) => s.points.map((p) => p.t));
    if (allY.length === 0 || allT.length === 0) return null;

    const tMin = Math.min(...allT);
    const tMax = Math.max(...allT);
    const tSpan = tMax - tMin || 1;

    const rawMin = Math.min(...allY);
    const rawMax = Math.max(...allY);
    const span = rawMax - rawMin || 1;
    const min = Math.max(0, rawMin - span * 0.08);
    const max = rawMax + span * 0.08;
    const range = max - min || 1;

    const xFor = (t: number) => m.left + ((t - tMin) / tSpan) * plotW;
    const yFor = (y: number) => m.top + (1 - (y - min) / range) * plotH;

    const dates = [...new Set(allT)].sort((a, b) => a - b);
    const yTicks = Array.from({ length: 5 }, (_, i) => min + (range / 4) * i);

    const tickCount = Math.min(5, dates.length);
    const spansYear =
      new Date(tMax).getFullYear() !== new Date(tMin).getFullYear();
    const xTicks = Array.from({ length: tickCount }, (_, i) => {
      const t =
        tickCount === 1 ? dates[0] : tMin + (i / (tickCount - 1)) * tSpan;
      return { x: xFor(t), label: formatTick(t, spansYear) };
    });

    return { tMin, tMax, xFor, yFor, dates, yTicks, xTicks, spansYear };
  }, [series, plotW, plotH, m.left, m.top]);

  if (!model) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-[var(--border-subtle)] text-sm text-[var(--text-muted)]"
        style={{ height }}
      >
        No strength data yet.
      </div>
    );
  }

  const { xFor, yFor, dates, yTicks, xTicks, spansYear } = model;

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    // Snap to the nearest session date.
    let nearest = dates[0];
    let best = Infinity;
    for (const t of dates) {
      const d = Math.abs(xFor(t) - px);
      if (d < best) {
        best = d;
        nearest = t;
      }
    }
    setActiveT(nearest);
  }

  const activeRows =
    activeT == null
      ? []
      : series
          .map((s) => {
            const pt = s.points.find((p) => p.t === activeT);
            return pt ? { name: s.name, color: s.color, y: pt.y } : null;
          })
          .filter((r): r is { name: string; color: string; y: number } => !!r);

  const activeX = activeT == null ? 0 : xFor(activeT);
  const tooltipLeftPct = (activeX / width) * 100;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none"
        role="img"
        aria-label={`Strength progress for ${series
          .map((s) => s.name)
          .join(", ")}`}
        onPointerMove={handleMove}
        onPointerDown={handleMove}
        onPointerLeave={() => setActiveT(null)}
      >
        {/* Y gridlines + labels */}
        {yTicks.map((v, i) => {
          const y = yFor(v);
          return (
            <g key={`y${i}`}>
              <line
                x1={m.left}
                y1={y}
                x2={width - m.right}
                y2={y}
                stroke="var(--border-subtle)"
                strokeWidth="1"
                opacity="0.6"
              />
              {/* Integer kg on the axis (no unit) so 3-digit loads don't clip;
                  the unit lives in the header, legend and tooltip. */}
              <text
                x={m.left - 7}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[var(--text-muted)]"
                style={{ fontSize: "11px" }}
              >
                {Math.round(v)}
              </text>
            </g>
          );
        })}

        {/* X date labels */}
        {xTicks.map((t, i) => (
          <text
            key={`x${i}`}
            x={t.x}
            y={m.top + plotH + 18}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            className="fill-[var(--text-muted)]"
            style={{ fontSize: "11px" }}
          >
            {t.label}
          </text>
        ))}

        {/* Crosshair */}
        {activeT != null && (
          <line
            x1={activeX}
            y1={m.top}
            x2={activeX}
            y2={m.top + plotH}
            stroke="var(--text-muted)"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.7"
          />
        )}

        {/* One line per series */}
        {series.map((s, si) => {
          if (s.points.length === 0) return null;
          const pts = s.points.map((p) => [xFor(p.t), yFor(p.y)] as const);
          const d = pts
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
            .join(" ");
          return (
            <g key={`s${si}`}>
              {s.points.length > 1 && (
                <path
                  d={d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={s.color} />
              ))}
            </g>
          );
        })}

        {/* Active markers (ring on the surface so they read over the lines) */}
        {activeT != null &&
          series.map((s, si) => {
            const pt = s.points.find((p) => p.t === activeT);
            if (!pt) return null;
            return (
              <circle
                key={`a${si}`}
                cx={xFor(pt.t)}
                cy={yFor(pt.y)}
                r="4"
                fill={s.color}
                stroke="var(--surface-primary)"
                strokeWidth="2"
              />
            );
          })}
      </svg>

      {/* Tooltip */}
      {activeT != null && activeRows.length > 0 && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-2 text-xs shadow-lg"
          style={{
            left: `clamp(64px, ${tooltipLeftPct}%, calc(100% - 64px))`,
          }}
        >
          <p className="mb-1 font-medium text-[var(--text-muted)]">
            {formatTick(activeT, spansYear)}
          </p>
          <div className="flex flex-col gap-0.5">
            {activeRows
              .sort((a, b) => b.y - a.y)
              .map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: r.color }}
                  />
                  <span className="text-[var(--text-secondary)]">{r.name}</span>
                  <span className="ml-auto pl-2 font-semibold text-[var(--text-primary)]">
                    {formatValue(r.y)}
                    {unit}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Legend — names every series (identity not by colour alone) with its
          current value and change since the first logged session. */}
      <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {series.map((s, i) => {
          const first = s.points[0]?.y ?? 0;
          const last = s.points[s.points.length - 1]?.y ?? 0;
          const delta = last - first;
          return (
            <li key={i} className="flex min-w-0 items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <span className="min-w-0 truncate text-[var(--text-secondary)]">{s.name}</span>
              <span className="ml-auto shrink-0 pl-2 font-semibold text-[var(--text-primary)]">
                {formatValue(last)}
                {unit}
              </span>
              <span
                className={`shrink-0 text-xs ${
                  delta > 0
                    ? "text-[var(--text-muted)]"
                    : delta < 0
                      ? "text-[var(--danger)]"
                      : "text-[var(--text-muted)]"
                }`}
              >
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)}
                {unit}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatValue(v: number) {
  return Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1);
}

function formatTick(t: number, withYear: boolean) {
  return new Date(t).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "2-digit" } : {}),
  });
}
