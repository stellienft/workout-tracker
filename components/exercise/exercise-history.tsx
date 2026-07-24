"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface HistoryPoint {
  date: string; // ISO
  e1rm: number; // estimated 1RM (kg)
  top: number; // heaviest set weight that day (kg)
  reps: number; // reps at the top set
}

const LIME = "#CCFF30";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function ExerciseHistory({ points }: { points: HistoryPoint[] }) {
  const stats = useMemo(() => {
    if (points.length === 0) return null;
    const pr = Math.max(...points.map((p) => p.top));
    const bestE1rm = Math.max(...points.map((p) => p.e1rm));
    const first = points[0].e1rm;
    const last = points[points.length - 1].e1rm;
    const change = first > 0 ? (last - first) / first : 0;
    return { pr, bestE1rm: Math.round(bestE1rm), sessions: points.length, change, last };
  }, [points]);

  if (!stats) return null;

  if (points.length < 2) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-bold">Your history</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Logged once so far — top set {points[0].top} kg × {points[0].reps}. Keep
          training it to see your progression chart.
        </p>
      </div>
    );
  }

  // Chart geometry in a 0..100 (x) by 0..40 (y) viewBox.
  const W = 100;
  const H = 40;
  const ys = points.map((p) => p.e1rm);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const px = (i: number) => (i / (points.length - 1)) * W;
  const py = (v: number) => H - 4 - ((v - min) / span) * (H - 8);

  const line = points.map((p, i) => `${px(i).toFixed(2)},${py(p.e1rm).toFixed(2)}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;

  const TrendIcon = stats.change > 0.02 ? TrendingUp : stats.change < -0.02 ? TrendingDown : Minus;
  const trendColor =
    stats.change > 0.02
      ? "text-[var(--accent-primary)]"
      : stats.change < -0.02
        ? "text-[var(--danger)]"
        : "text-[var(--text-muted)]";

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Your history</h2>
        <span className={`inline-flex items-center gap-1 text-sm ${trendColor}`}>
          <TrendIcon className="h-4 w-4" />
          {stats.change >= 0 ? "+" : ""}
          {Math.round(stats.change * 100)}%
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="PR" value={`${stats.pr} kg`} />
        <Stat label="Best e1RM" value={`${stats.bestE1rm} kg`} />
        <Stat label="Sessions" value={String(stats.sessions)} />
      </div>

      <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
        <p className="text-xs text-[var(--text-muted)]">Estimated 1RM over time</p>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="mt-2 h-40 w-full overflow-visible"
        >
          <defs>
            <linearGradient id="exHistFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LIME} stopOpacity="0.35" />
              <stop offset="100%" stopColor={LIME} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#exHistFill)" />
          <polyline
            points={line}
            fill="none"
            stroke={LIME}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={px(points.length - 1)} cy={py(points[points.length - 1].e1rm)} r={1.8} fill={LIME} />
        </svg>
        <div className="mt-1 flex justify-between text-[11px] text-[var(--text-muted)]">
          <span>{fmt(points[0].date)}</span>
          <span>{fmt(points[points.length - 1].date)}</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
