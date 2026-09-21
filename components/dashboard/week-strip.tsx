import { Check } from "lucide-react";
import { todayInTz, DEFAULT_TZ } from "@/lib/timezone";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Clean weekly attendance strip for the dashboard — just the 7 day cells
 * (today highlighted, a check on days trained). Computed in the member's
 * timezone so "today" matches their local day, not the server's UTC clock.
 */
export function WeekStrip({
  trainedDates,
  tz = DEFAULT_TZ,
}: {
  trainedDates: string[];
  tz?: string;
}) {
  const todayIso = todayInTz(tz);
  // Anchor at UTC noon so day arithmetic never crosses a DST boundary.
  const anchor = new Date(`${todayIso}T12:00:00Z`);
  const mondayIndex = (anchor.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(anchor.getTime() - mondayIndex * 86_400_000);
  const days = Array.from(
    { length: 7 },
    (_, i) => new Date(monday.getTime() + i * 86_400_000)
  );
  const trained = new Set(trainedDates);

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d, i) => {
        const iso = d.toISOString().slice(0, 10);
        const isToday = iso === todayIso;
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
            <span className="mt-1 text-sm font-bold">{d.getUTCDate()}</span>
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
