"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  enrolInProgram,
  toggleSavedProgram,
} from "@/lib/actions/enrolment";
import { Bookmark, BookmarkCheck } from "lucide-react";

export function EnrolButton({
  programId,
  minDays,
  maxDays,
  isCurrent,
  hasOtherActive,
  otherProgramName,
  initiallySaved,
}: {
  programId: string;
  minDays: number;
  maxDays: number;
  isCurrent: boolean;
  hasOtherActive: boolean;
  otherProgramName?: string | null;
  initiallySaved: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [showSwitch, setShowSwitch] = useState(false);
  const [days, setDays] = useState(Math.min(3, maxDays));
  const [saved, setSaved] = useState(initiallySaved);

  function doEnrol(switchMode: "immediate" | "pause_only") {
    startTransition(async () => {
      const res = await enrolInProgram({ programId, daysPerWeek: days, switchMode });
      if (res.ok) {
        toast(
          switchMode === "pause_only"
            ? "Program saved as pending."
            : "You're enrolled. Let's go!",
          "success"
        );
        setShowSwitch(false);
        router.push("/dashboard");
        router.refresh();
      } else {
        toast(res.error ?? "Could not enrol", "error");
      }
    });
  }

  function onEnrolClick() {
    if (hasOtherActive && !isCurrent) {
      setShowSwitch(true);
    } else {
      doEnrol("immediate");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {maxDays > minDays && (
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            Days/wk
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2 py-1.5 text-[var(--text-primary)]"
            >
              {Array.from({ length: maxDays - minDays + 1 }, (_, i) => minDays + i).map(
                (d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                )
              )}
            </select>
          </label>
        )}
        <Button onClick={onEnrolClick} disabled={pending} size="lg" className="flex-1">
          {isCurrent ? "Go to dashboard" : pending ? "Enrolling…" : "Start Program"}
        </Button>
        <button
          onClick={() =>
            startTransition(async () => {
              const res = await toggleSavedProgram(programId);
              if (res.ok) setSaved(!!res.saved);
            })
          }
          aria-label={saved ? "Remove from saved" : "Save program"}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border-active)]"
        >
          {saved ? (
            <BookmarkCheck className="h-5 w-5 text-[var(--accent-primary)]" />
          ) : (
            <Bookmark className="h-5 w-5" />
          )}
        </button>
      </div>

      {showSwitch && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
            <h3 className="text-lg font-bold">Switch programs?</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              You&apos;re currently on{" "}
              <span className="text-[var(--text-primary)]">{otherProgramName ?? "another program"}</span>
              . Your history is always kept. What would you like to do?
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={() => doEnrol("immediate")} disabled={pending}>
                Start this program now
              </Button>
              <Button
                variant="secondary"
                onClick={() => doEnrol("pause_only")}
                disabled={pending}
              >
                Save current as paused, keep it active
              </Button>
              <Button variant="ghost" onClick={() => setShowSwitch(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
