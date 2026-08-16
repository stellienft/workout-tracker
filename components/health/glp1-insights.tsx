"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Syringe, TrendingDown, CalendarClock, Activity, Target, Pencil } from "lucide-react";
import { LineChart } from "@/components/ui/line-chart";
import { saveGoalWeight } from "@/lib/actions/tracking";
import { useToast } from "@/components/ui/toast";

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
  goalKg: number | null;
  remainingKg: number | null; // to lose to reach goal (positive)
  progressPct: number | null; // 0–100 toward goal
  projectedDateLabel: string | null; // est. date to reach goal
  reached: boolean;
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

            <GoalBlock journey={journey} />
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

/** Goal-weight target + projected date, with an inline setter. */
function GoalBlock({ journey }: { journey: Glp1Journey }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(journey.goalKg != null ? String(journey.goalKg) : "");

  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  function save(kg: number | null) {
    start(async () => {
      const res = await saveGoalWeight(kg);
      if (res.ok) {
        setEditing(false);
        toast(kg == null ? "Goal cleared." : "Goal saved.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't save goal", "error");
      }
    });
  }

  if (editing || journey.goalKg == null) {
    return (
      <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Target className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Goal weight (kg)"
              className="h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] pl-9 pr-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
            />
          </div>
          <button
            onClick={() => value && save(Number(value))}
            disabled={pending || !value}
            className="rounded-xl bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-50"
          >
            Save
          </button>
          {journey.goalKg != null && (
            <button
              onClick={() => setEditing(false)}
              className="rounded-xl px-2 py-2 text-sm text-[var(--text-secondary)]"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Target className="h-4 w-4" /> Goal {fmt(journey.goalKg)} kg
        </span>
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>

      {journey.progressPct != null && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-secondary)]">
          <div
            className="h-full rounded-full bg-[var(--accent-primary)]"
            style={{ width: `${journey.progressPct}%` }}
          />
        </div>
      )}

      <p className="mt-2 text-sm">
        {journey.reached ? (
          <span className="font-semibold text-[var(--accent-primary)]">
            🎉 Goal reached — amazing work!
          </span>
        ) : (
          <>
            <span className="font-semibold">{fmt(journey.remainingKg ?? 0)} kg to go</span>
            {journey.projectedDateLabel ? (
              <span className="text-[var(--text-secondary)]">
                {" "}
                · on track for <span className="text-[var(--accent-primary)]">~{journey.projectedDateLabel}</span>
              </span>
            ) : (
              <span className="text-[var(--text-muted)]">
                {" "}
                · keep a steady deficit to project a date
              </span>
            )}
          </>
        )}
      </p>

      {!journey.reached && (
        <button
          onClick={() => save(null)}
          disabled={pending}
          className="mt-1 text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
        >
          Clear goal
        </button>
      )}
    </div>
  );
}
