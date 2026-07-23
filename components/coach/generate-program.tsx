"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { generateAdaptiveProgram } from "@/lib/actions/ai-coach";

export function GenerateProgram({
  suggestedDays,
  hasExisting,
  existingSplitId,
}: {
  suggestedDays: number;
  hasExisting: boolean;
  existingSplitId: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState(suggestedDays);

  function generate() {
    startTransition(async () => {
      const res = await generateAdaptiveProgram({ daysPerWeek: days });
      if (res.ok) {
        toast("Your adaptive plan is ready.", "success");
        router.push(`/splits/${res.id}`);
        router.refresh();
      } else {
        toast(res.error ?? "Could not generate plan", "error");
      }
    });
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[var(--accent-primary)]" />
        <p className="font-semibold">
          {hasExisting ? "Refresh your adaptive plan" : "Generate your adaptive plan"}
        </p>
      </div>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Built from your own numbers — progressive weight targets on lifts that are
        climbing, deloads on the ones that have stalled, and more room for
        under-trained muscles. Saved as a split you can train right away.
      </p>

      <label className="mt-4 flex items-center gap-3 text-sm text-[var(--text-secondary)]">
        Days per week
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-[var(--text-primary)]"
        >
          {[3, 4, 5].map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={generate} disabled={pending} size="lg" className="gap-1.5">
          <Sparkles className="h-4 w-4" />
          {pending ? "Building…" : hasExisting ? "Regenerate" : "Generate plan"}
        </Button>
        {hasExisting && existingSplitId && (
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push(`/splits/${existingSplitId}`)}
            className="gap-1.5"
          >
            View current plan <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
