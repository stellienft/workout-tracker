"use client";

import { Syringe, TrendingDown, CalendarClock, Activity } from "lucide-react";
import { LineChart } from "@/components/ui/line-chart";

export interface Glp1NextDose {
  dateLabel: string;
  daysUntil: number; // negative = overdue
}

export interface Glp1Journey {
  startKg: number;
  currentKg: number;
  lostKg: number; // positive = lost
  pct: number; // positive = lost
  weeks: number;
  perWeekKg: number | null;
}

export interface Glp1SideEffects {
  doseCount: number;
  withEffects: number;
  topEffects: { name: string; count: number }[];
  severityTrend: "down" | "up" | "flat" | null;
}

export interface Glp1Data {
  medicationName: string | null;
  currentDoseMg: number | null;
  nextDose: Glp1NextDose | null;
  doseSeries: { x: string; y: number }[];
  weightSeries: { x: string; y: number }[];
  journey: Glp1Journey | null;
  sideEffects: Glp1SideEffects | null;
}

/**
 * GLP-1 companion insights, computed on the server from the member's own dose
 * logs and body-weight metrics. Everything is guarded so a first-time user just
 * sees the pieces they have data for. Personal tracking, not medical advice.
 */
export function Glp1Insights({ data }: { data: Glp1Data }) {
  const { nextDose, journey, sideEffects, doseSeries, weightSeries } = data;

  const nothing =
    !nextDose && !journey && !sideEffects && doseSeries.length === 0;
  if (nothing) return null;

  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold">GLP-1 companion</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Your dose, weight and side effects together. A personal log — not medical
        advice.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {/* Next dose due */}
        {nextDose && (
          <div
            className={`rounded-[var(--radius-card)] border p-5 ${
              nextDose.daysUntil <= 0
                ? "border-[var(--accent-primary)]/50 bg-[var(--accent-muted)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-primary)]"
            }`}
          >
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <CalendarClock className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">Next dose</span>
            </div>
            <p className="mt-1 text-2xl font-extrabold">{nextDose.dateLabel}</p>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              {nextDose.daysUntil > 1
                ? `In ${nextDose.daysUntil} days`
                : nextDose.daysUntil === 1
                  ? "Tomorrow"
                  : nextDose.daysUntil === 0
                    ? "Due today"
                    : `${Math.abs(nextDose.daysUntil)} day${
                        Math.abs(nextDose.daysUntil) === 1 ? "" : "s"
                      } overdue`}
              {data.currentDoseMg ? ` · ${fmt(data.currentDoseMg)} mg` : ""}
            </p>
          </div>
        )}

        {/* Weight-loss journey */}
        {journey && (
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">
                Weight-loss journey
              </span>
            </div>
            <p className="mt-1 text-2xl font-extrabold">
              {journey.lostKg >= 0 ? "−" : "+"}
              {fmt(Math.abs(journey.lostKg))} kg
              <span className="ml-2 text-base font-semibold text-[var(--accent-primary)]">
                {journey.pct >= 0 ? "−" : "+"}
                {Math.abs(journey.pct).toFixed(1)}%
              </span>
            </p>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              {fmt(journey.startKg)} → {fmt(journey.currentKg)} kg
              {journey.perWeekKg != null &&
                ` · ${journey.perWeekKg >= 0 ? "−" : "+"}${fmt(
                  Math.abs(journey.perWeekKg)
                )} kg/wk`}
            </p>
          </div>
        )}
      </div>

      {/* Weight trend */}
      {weightSeries.length >= 2 && (
        <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <p className="mb-3 text-sm text-[var(--text-secondary)]">
            Body weight since you started tracking
          </p>
          <LineChart data={weightSeries} label="Weight" unit=" kg" height={180} />
        </div>
      )}

      {/* Dose escalation */}
      {doseSeries.length >= 2 && (
        <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <div className="mb-3 flex items-center gap-2 text-[var(--text-secondary)]">
            <Syringe className="h-4 w-4" />
            <span className="text-sm">Dose over time</span>
          </div>
          <LineChart data={doseSeries} label="Dose" unit=" mg" height={150} />
        </div>
      )}

      {/* Side effects */}
      {sideEffects && sideEffects.doseCount > 0 && (
        <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Activity className="h-4 w-4" />
            <span className="text-sm">Side effects</span>
          </div>
          <p className="mt-2 text-sm">
            Logged on{" "}
            <span className="font-semibold">
              {sideEffects.withEffects} of {sideEffects.doseCount}
            </span>{" "}
            doses.
            {sideEffects.severityTrend === "down" && (
              <span className="text-[var(--accent-primary)]">
                {" "}
                Severity is easing as your body adjusts 👍
              </span>
            )}
            {sideEffects.severityTrend === "up" && (
              <span className="text-[var(--warning)]">
                {" "}
                Severity has been rising — worth mentioning to your prescriber.
              </span>
            )}
          </p>
          {sideEffects.topEffects.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sideEffects.topEffects.map((e) => (
                <span
                  key={e.name}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
                >
                  {e.name}
                  <span className="text-[var(--text-muted)]">×{e.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
