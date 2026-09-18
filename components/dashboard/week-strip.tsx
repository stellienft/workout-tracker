import Link from "next/link";
import { Check } from "lucide-react";
import { startOfWeek, isoDate } from "@/lib/utils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Compact weekly attendance strip for the dashboard — the same day design as
 * the Schedule page, showing which days this week you trained (checked) with
 * today highlighted, plus a trained-days count. Tapping opens the Schedule.
 */
export function WeekStrip({ trainedDates }: { trainedDates: string[] }) {
  const weekStart = startOfWeek(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const today = isoDate(new Date());
  const trained = new Set(trainedDates);
  const count = days.filter((d) => trained.has(isoDate(d))).length;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">This week</p>
        <Link
          href="/schedule"
          className="text-xs font-medium text-[var(--accent-primary)]"
        >
          {count} day{count === 1 ? "" : "s"} trained
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d, i) => {
          const iso = isoDate(d);
          const isToday = iso === today;
          const didWork = trained.has(iso);
          return (
            <div
              key={iso}
              className={`flex flex-col items-center rounded-2xl border p-2 ${
                isToday
                  ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
                  : "border-[var(--border-subtle)]"
              }`}
            >
              <span className="text-[10px] uppercase text-[var(--text-muted)]">
                {DAY_LABELS[i]}
              </span>
              <span className="mt-1 text-sm font-bold">{d.getDate()}</span>
              <span className="mt-1 flex h-3 w-3 items-center justify-center">
                {didWork ? (
                  <Check className="h-3 w-3 text-[var(--accent-primary)]" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--surface-elevated)]" />
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
