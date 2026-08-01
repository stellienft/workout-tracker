import { Flame } from "lucide-react";
import type { StreakInfo } from "@/lib/streak";

/** Condensed streak banner — a slim single row rather than a big card. */
export function StreakCard({ streak }: { streak: StreakInfo }) {
  if (streak.current === 0) return null;

  const { current, atRisk } = streak;
  return (
    <div
      className={`mt-4 inline-flex max-w-full items-center gap-2 rounded-full border px-3.5 py-2 ${
        atRisk
          ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-primary)]"
      }`}
    >
      <Flame className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
      <span className="text-sm font-semibold">{current}-day streak</span>
      <span className="truncate text-xs text-[var(--text-muted)]">
        {atRisk ? "· train today to keep it alive" : "· keep it going"}
      </span>
    </div>
  );
}
