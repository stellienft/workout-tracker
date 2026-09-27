"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { CoverImage } from "@/components/ui/cover-image";
import { StartWorkoutButton } from "@/components/start-workout-button";
import { Button } from "@/components/ui/button";
import { switchActiveProgram } from "@/lib/actions/enrolment";
import type { InProgressProgram } from "@/lib/queries";

export interface ActiveProgramInfo {
  programName: string;
  workoutName: string;
  workoutId: string;
  sessionId: string | null;
  week: number;
  coverPath: string | null;
}

/**
 * When a member holds two programs, show them side by side as a grid (no swipe):
 * the active program with today's workout + Start, and the parked program with a
 * one-tap Switch. Single-program members keep the full hero elsewhere.
 */
export function ProgramGrid({
  active,
  others,
}: {
  active: ActiveProgramInfo;
  others: InProgressProgram[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const switchTo = (enrolmentId: string) =>
    start(async () => {
      await switchActiveProgram(enrolmentId);
      router.refresh();
    });

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Active program — today's workout */}
      <div className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[color:color-mix(in_srgb,var(--accent-primary)_50%,transparent)] bg-[var(--surface-primary)]">
        <div className="relative h-32 w-full sm:h-36">
          <CoverImage path={active.coverPath} alt={active.workoutName} sizes="50vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <span className="absolute left-2 top-2 rounded-full bg-[var(--accent-primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent-ink)]">
            Active
          </span>
          <div className="on-media absolute inset-x-0 bottom-0 p-2.5">
            <p className="truncate text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
              {active.programName} · Wk {active.week}
            </p>
            <h3 className="line-clamp-2 text-sm font-bold leading-tight">
              {active.workoutName}
            </h3>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-2 p-2.5">
          <StartWorkoutButton
            workoutTemplateId={active.workoutId}
            existingSessionId={active.sessionId}
            className="w-full"
          />
          <Link
            href={`/workouts/${active.workoutId}`}
            className="text-center text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Preview
          </Link>
        </div>
      </div>

      {/* Parked program(s) — switch in */}
      {others.map((p) => (
        <div
          key={p.enrolmentId}
          className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
        >
          <div className="relative h-32 w-full sm:h-36">
            <CoverImage path={p.coverPath} alt={p.name} sizes="50vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="on-media absolute inset-x-0 bottom-0 p-2.5">
              <p className="truncate text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
                {p.status === "pending" ? "Not started" : "Paused"} · Wk {p.week}
              </p>
              <h3 className="line-clamp-2 text-sm font-bold leading-tight">{p.name}</h3>
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-end p-2.5">
            <Button
              variant="secondary"
              onClick={() => switchTo(p.enrolmentId)}
              disabled={pending}
              className="w-full"
            >
              <ArrowLeftRight className="h-4 w-4" /> {pending ? "Switching…" : "Switch"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
