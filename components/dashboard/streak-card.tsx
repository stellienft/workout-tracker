import { Flame } from "lucide-react";
import type { StreakInfo } from "@/lib/streak";

/** Prominent streak banner — celebrates a run and nudges when it's at risk. */
export function StreakCard({ streak }: { streak: StreakInfo }) {
  if (streak.current === 0) return null;

  const { current, atRisk } = streak;
  return (
    <div
      className={`mt-4 flex items-center gap-4 rounded-[var(--radius-card)] border p-4 ${
        atRisk
          ? "border-[var(--border-active)] bg-[var(--surface-primary)] ring-1 ring-[var(--accent-primary)]/25"
          : "border-[var(--border-subtle)] bg-[var(--surface-primary)]"
      }`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent-primary)]">
        <Flame className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold">
          {current} day{current === 1 ? "" : "s"} streak
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          {atRisk
            ? "Train today to keep it alive 🔥"
            : "Nice work — keep it going 🔥"}
        </p>
      </div>
    </div>
  );
}
