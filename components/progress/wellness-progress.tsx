"use client";

import { useState } from "react";
import { Droplet, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { WellnessTrackers } from "@/components/dashboard/wellness-trackers";

export interface WellnessSummary {
  days: number; // days with any entry in the range
  avgWaterMl: number; // mean daily water across days with a water entry
  avgSleepHours: number; // mean sleep across days with a sleep entry
}

export function WellnessProgress({
  today,
  initialWaterMl,
  initialSleepHours,
  week,
  month,
}: {
  today: string;
  initialWaterMl: number;
  initialSleepHours: number | null;
  week: WellnessSummary;
  month: WellnessSummary;
}) {
  const [range, setRange] = useState<"week" | "month">("week");
  const s = range === "week" ? week : month;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Water &amp; sleep</h2>
        <div className="flex rounded-full bg-[var(--surface-secondary)] p-0.5 text-xs">
          {(["week", "month"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full px-3 py-1 font-medium transition-colors",
                range === r
                  ? "bg-[var(--accent-primary)] text-[var(--accent-ink)]"
                  : "text-[var(--text-secondary)]"
              )}
            >
              {r === "week" ? "This week" : "This month"}
            </button>
          ))}
        </div>
      </div>

      {/* Today's quick-log */}
      <div className="mt-4">
        <WellnessTrackers
          date={today}
          initialWaterMl={initialWaterMl}
          initialSleepHours={initialSleepHours}
        />
      </div>

      {/* Range averages */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3">
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <Droplet className="h-3.5 w-3.5" /> Avg water / day
          </p>
          <p className="mt-0.5 text-lg font-bold">
            {s.avgWaterMl > 0 ? `${(s.avgWaterMl / 1000).toFixed(1)} L` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3">
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <Moon className="h-3.5 w-3.5" /> Avg sleep / night
          </p>
          <p className="mt-0.5 text-lg font-bold">
            {s.avgSleepHours > 0 ? `${s.avgSleepHours.toFixed(1)} h` : "—"}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        {s.days > 0
          ? `Based on ${s.days} day${s.days === 1 ? "" : "s"} logged ${
              range === "week" ? "this week" : "this month"
            }.`
        : `No entries yet ${range === "week" ? "this week" : "this month"}.`}
      </p>
    </div>
  );
}
