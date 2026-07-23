"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Sparkles, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  importExercises,
  seedStarterExercises,
  rehostExerciseGifs,
} from "@/lib/actions/exercises-admin";

const SUGGESTIONS = [
  "bench press",
  "squat",
  "deadlift",
  "shoulder press",
  "row",
  "pull up",
  "curl",
  "plank",
];

export function ExerciseImport({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [seeding, startSeeding] = useTransition();
  const [query, setQuery] = useState("");
  const [number, setNumber] = useState(10);
  const [lastResult, setLastResult] = useState<string | null>(null);

  function run() {
    if (query.trim().length < 2) {
      toast("Enter a search term.", "error");
      return;
    }
    startTransition(async () => {
      const res = await importExercises({ query: query.trim(), number });
      if (res.ok) {
        const msg =
          "message" in res && res.message
            ? res.message
            : `Imported ${res.imported} exercise${res.imported === 1 ? "" : "s"}.`;
        setLastResult(msg);
        toast(msg, "success");
        router.refresh();
      } else {
        toast(res.error ?? "Import failed", "error");
      }
    });
  }

  function seed() {
    startSeeding(async () => {
      const res = await seedStarterExercises();
      if (res.ok) {
        const msg = "message" in res && res.message ? res.message : `Imported ${res.imported}.`;
        setLastResult(msg);
        toast(msg, "success");
        router.refresh();
      } else {
        toast(res.error ?? "Seed failed", "error");
      }
    });
  }

  function rehost() {
    startSeeding(async () => {
      const res = await rehostExerciseGifs();
      if (res.ok) {
        const msg = "message" in res && res.message ? res.message : `Re-hosted ${res.rehosted}.`;
        setLastResult(msg);
        toast(msg, "success");
        router.refresh();
      } else {
        toast(res.error ?? "Re-host failed", "error");
      }
    });
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div>
        <p className="font-semibold">Import exercises from ExerciseDB</p>
        <p className="text-sm text-[var(--text-secondary)]">
          Real exercises with animated GIF demos, target muscles and steps.
          Imports dedupe, so re-running a search tops up the library.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Search e.g. bench press"
          disabled={disabled}
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none disabled:opacity-50"
        />
        <select
          value={number}
          onChange={(e) => setNumber(Number(e.target.value))}
          disabled={disabled}
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm disabled:opacity-50"
        >
          {[5, 10, 15, 20].map((n) => (
            <option key={n} value={n}>
              {n} results
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setQuery(s)}
            disabled={disabled}
            className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--border-active)] disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={disabled || pending || seeding} className="gap-1.5">
          <Download className="h-4 w-4" />
          {pending ? "Importing…" : "Import"}
        </Button>
        <button
          onClick={seed}
          disabled={disabled || pending || seeding}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
          {seeding ? "Seeding…" : "Seed the main lifts"}
        </button>
        <button
          onClick={rehost}
          disabled={pending || seeding}
          title="Download imported GIFs onto our storage so they load in the app"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          <Film className="h-4 w-4 text-[var(--accent-primary)]" />
          {seeding ? "Working…" : "Re-host GIFs"}
        </button>
        {lastResult && (
          <span className="text-sm text-[var(--text-secondary)]">{lastResult}</span>
        )}
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Imported exercises are published to the library; you can then edit
        instructions, shoulder-safety and add a YouTube demo below.
      </p>
    </div>
  );
}
