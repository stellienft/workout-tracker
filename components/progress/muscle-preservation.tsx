"use client";

import Link from "next/link";
import { ShieldCheck, TriangleAlert, Minus, Beef } from "lucide-react";
import { MultiLineChart } from "@/components/ui/multi-line-chart";

export type PreservationTone = "good" | "warn" | "neutral";

export interface PreservationInsight {
  tone: PreservationTone;
  title: string;
  body: string;
}

/**
 * Muscle-preservation view: body-weight trend and a composite strength trend
 * overlaid on one chart (each indexed to 100% at its own baseline, so the two
 * curves are comparable). The whole point is to catch the GLP-1 failure mode —
 * losing weight *and* strength at the same time — and nudge protein + volume.
 */
export function MusclePreservation({
  weightSeries,
  strengthSeries,
  insight,
  proteinTargetG,
}: {
  weightSeries: { t: number; y: number }[];
  strengthSeries: { t: number; y: number }[];
  insight: PreservationInsight;
  proteinTargetG: number | null;
}) {
  const hasBoth = weightSeries.length >= 2 && strengthSeries.length >= 2;

  const toneStyles: Record<
    PreservationTone,
    { border: string; bg: string; fg: string; Icon: typeof ShieldCheck }
  > = {
    good: {
      border: "border-[var(--accent-primary)]/40",
      bg: "bg-[var(--accent-muted)]",
      fg: "text-[var(--accent-primary)]",
      Icon: ShieldCheck,
    },
    warn: {
      border: "border-[var(--warning)]/40",
      bg: "bg-[var(--warning)]/10",
      fg: "text-[var(--warning)]",
      Icon: TriangleAlert,
    },
    neutral: {
      border: "border-[var(--border-subtle)]",
      bg: "bg-[var(--surface-secondary)]",
      fg: "text-[var(--text-secondary)]",
      Icon: Minus,
    },
  };
  const t = toneStyles[insight.tone];

  return (
    <div className="mt-6">
      <h2 className="text-lg font-bold">Muscle preservation</h2>
      <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
        Are you keeping strength while your weight changes? Both lines are shown
        as a percentage of where you started.
      </p>

      <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
        {/* Insight banner */}
        <div className={`flex gap-3 rounded-xl border ${t.border} ${t.bg} p-4`}>
          <t.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${t.fg}`} />
          <div>
            <p className={`text-sm font-semibold ${t.fg}`}>{insight.title}</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {insight.body}
            </p>
          </div>
        </div>

        {hasBoth ? (
          <div className="mt-4">
            <MultiLineChart
              unit="%"
              height={260}
              series={[
                {
                  name: "Body weight",
                  color: "var(--series-1)",
                  points: weightSeries,
                },
                {
                  name: "Strength",
                  color: "var(--series-2)",
                  points: strengthSeries,
                },
              ]}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Log your body weight and a few weeks of workouts to see your
            weight-vs-strength trend here.
          </p>
        )}

        {/* Protein target — the #1 lever for holding muscle in a deficit. */}
        {proteinTargetG != null && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent-primary)]">
                <Beef className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  Protein target ≈ {proteinTargetG} g / day
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Hitting this is what protects muscle while you lose weight.
                </p>
              </div>
            </div>
            <Link
              href="/nutrition"
              className="shrink-0 rounded-full bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)]"
            >
              Track it
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
