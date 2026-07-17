import { ProgressRing } from "@/components/ui/progress-ring";
import { Check, Circle } from "lucide-react";
import type { WorkoutTemplate } from "@/lib/types";
import type { WeeklyProgress } from "@/lib/engine";

export function WeeklyCompletionCard({
  week,
  weekly,
  templates,
  completedIds,
}: {
  week: number;
  weekly: WeeklyProgress;
  templates: WorkoutTemplate[];
  completedIds: string[];
}) {
  // Show required workouts (weekly split / calendar) or the rotation.
  const required = templates.filter((t) => !t.is_optional).slice(0, 6);
  const doneSet = new Set(completedIds);

  return (
    <div className="h-full rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        This week · Week {week}
      </p>
      <div className="mt-3 flex items-center gap-4">
        <ProgressRing percent={weekly.percent} size={72} />
        <div>
          <p className="text-lg font-bold">
            {weekly.completed} of {weekly.target} workouts
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            {weekly.remaining === 0
              ? "Weekly target complete 🎉"
              : `${weekly.remaining} to go`}
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {required.map((t) => {
          const done = doneSet.has(t.id);
          return (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              {done ? (
                <Check className="h-4 w-4 text-[var(--accent-primary)]" />
              ) : (
                <Circle className="h-4 w-4 text-[var(--text-muted)]" />
              )}
              <span className={done ? "text-white" : "text-[var(--text-secondary)]"}>
                {t.name}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
