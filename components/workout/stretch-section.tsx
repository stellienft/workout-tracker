"use client";

import { useState, useTransition } from "react";
import { PersonStanding, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseImage } from "@/components/ui/exercise-image";
import { logStretches } from "@/lib/actions/workout";

export interface StretchVM {
  slug: string;
  name: string;
  muscle: string;
  coverPath: string | null;
  instructions: string | null;
}

/**
 * Pre-workout stretch block shown above the warm-up. Lists a handful of
 * stretches matched to the muscles this workout trains; tapping one marks it
 * done (recorded on the session) and expands its how-to. Entirely optional.
 */
export function StretchSection({
  sessionId,
  stretches,
  initialDone,
}: {
  sessionId: string;
  stretches: StretchVM[];
  initialDone: string[];
}) {
  const [done, setDone] = useState<Set<string>>(new Set(initialDone));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(initialDone.length > 0);
  const [, startTransition] = useTransition();

  if (stretches.length === 0) return null;

  function persist(next: Set<string>) {
    const payload = stretches
      .filter((s) => next.has(s.slug))
      .map((s) => ({ slug: s.slug, name: s.name, muscle: s.muscle }));
    startTransition(async () => {
      await logStretches({ sessionId, stretches: payload });
    });
  }

  function toggle(slug: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      persist(next);
      return next;
    });
  }

  const doneCount = stretches.filter((s) => done.has(s.slug)).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
      {/* Header / collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <PersonStanding className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
        <span className="flex-1 text-sm font-semibold">
          Stretch{" "}
          <span className="font-normal text-[var(--text-muted)]">
            · loosen up before you lift
          </span>
        </span>
        <span className="text-xs tabular-nums text-[var(--text-muted)]">
          {doneCount}/{stretches.length}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--text-muted)] transition-transform",
            collapsed ? "" : "rotate-180",
          )}
        />
      </button>

      {!collapsed && (
        <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
          {stretches.map((s) => {
            const isDone = done.has(s.slug);
            const isOpen = expanded === s.slug;
            return (
              <li key={s.slug}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  {/* Tick */}
                  <button
                    onClick={() => toggle(s.slug)}
                    aria-pressed={isDone}
                    aria-label={isDone ? `Mark ${s.name} not done` : `Mark ${s.name} done`}
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                      isDone
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--accent-ink)]"
                        : "border-[var(--border-subtle)] text-transparent",
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </button>

                  {/* Thumbnail */}
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white">
                    <ExerciseImage path={s.coverPath} alt={s.name} fit="contain" />
                  </div>

                  {/* Name + muscle, tap to expand how-to */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : s.slug)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        isDone && "text-[var(--text-muted)] line-through",
                      )}
                    >
                      {s.name}
                    </p>
                    <p className="text-xs capitalize text-[var(--text-muted)]">
                      {s.muscle} · hold ~20–30s
                    </p>
                  </button>

                  {s.instructions && (
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  )}
                </div>

                {isOpen && s.instructions && (
                  <p className="px-4 pb-3 pl-[4.25rem] text-xs leading-relaxed text-[var(--text-secondary)]">
                    {s.instructions}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
