"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelWorkout } from "@/lib/actions/workout";
import { useToast } from "@/components/ui/toast";

/** Resume-workout banner with a Continue action and a Discard (cancel) option. */
export function ResumeBanner({
  sessionId,
  kicker,
  detail,
}: {
  sessionId: string;
  kicker: string;
  detail: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  function discard() {
    if (
      !confirm(
        "Discard this workout? It will be deleted along with any sets you logged."
      )
    )
      return;
    start(async () => {
      const res = await cancelWorkout(sessionId);
      if (res.ok) {
        toast("Workout discarded.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't discard — try again.", "error");
      }
    });
  }

  return (
    <div className="mt-5 flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-active)] bg-[var(--accent-muted)] p-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
          {kicker}
        </p>
        <p className="text-sm text-[var(--text-secondary)]">{detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={discard}
          disabled={pending}
          className="rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--danger)] disabled:opacity-50"
        >
          Discard
        </button>
        <button
          onClick={() => router.push(`/workout/${sessionId}`)}
          className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)]"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
