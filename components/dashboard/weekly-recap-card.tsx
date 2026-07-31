"use client";

import { useState, useTransition } from "react";
import { Sparkles, Target } from "lucide-react";
import { generateWeeklyRecap } from "@/lib/actions/recap";

interface Recap {
  summary: string;
  focus: string | null;
  stats: Record<string, unknown>;
  weekStart: string;
}

export function WeeklyRecapCard({ initial }: { initial: Recap | null }) {
  const [recap, setRecap] = useState<Recap | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function generate() {
    setError(null);
    start(async () => {
      const res = await generateWeeklyRecap();
      if (res.ok) setRecap(res.recap as Recap);
      else setError(res.error);
    });
  }

  const num = (k: string) => (recap?.stats?.[k] as number | null) ?? null;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <p className="flex items-center gap-2 font-semibold">
        <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" /> Your weekly recap
      </p>

      {recap ? (
        <>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{recap.summary}</p>
          {recap.focus && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--surface-secondary)] p-3">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
              <p className="text-sm">
                <span className="font-semibold">Next week: </span>
                <span className="text-[var(--text-secondary)]">{recap.focus}</span>
              </p>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {num("sessions7") != null && (
              <Chip label={`${num("sessions7")} sessions`} />
            )}
            {num("streak") ? <Chip label={`${num("streak")}-day streak`} /> : null}
            {num("totalVolume") != null && (
              <Chip label={`${Number(num("totalVolume")).toLocaleString()} kg volume`} />
            )}
            {num("weightChange") != null && (
              <Chip
                label={`${num("weightChange")! > 0 ? "+" : ""}${num("weightChange")} kg`}
              />
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            A quick AI summary of your week — what you did and where to focus next.
          </p>
          {error && <p className="mt-2 text-sm text-[var(--text-muted)]">{error}</p>}
          <button
            onClick={generate}
            disabled={pending}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {pending ? "Writing your recap…" : "Generate my recap"}
          </button>
        </>
      )}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
      {label}
    </span>
  );
}
