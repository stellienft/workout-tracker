import { Check } from "lucide-react";
import { startOfWeek, isoDate } from "@/lib/utils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Clean weekly attendance strip for the dashboard — just the 7 day cells
 * (today highlighted, a check on days trained), no surrounding card or header.
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

  return (
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
  );
}
