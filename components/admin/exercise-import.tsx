"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Sparkles, Film, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  importExercises,
  seedStarterExercises,
  rehostExerciseGifs,
  importFreeCatalog,
  importAllExerciseDb,
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

  // Import the entire ExerciseDB catalogue (Pro key), one page per request.
  function importAll() {
    startSeeding(async () => {
      let offset = 0;
      let total = 0;
      for (let guard = 0; guard < 100; guard++) {
        const res = await importAllExerciseDb(offset);
        if (!res.ok) {
          toast(res.error ?? "Import failed", "error");
          setLastResult(res.error ?? null);
          return;
        }
        total += res.imported;
        setLastResult(`Importing all of ExerciseDB… ${res.nextOffset} fetched, ${total} saved`);
        if (!res.hasMore) break;
        offset = res.nextOffset;
      }
      const msg = `Imported ${total} exercises from ExerciseDB. Now run “Re-host GIFs” so the animations load.`;
      setLastResult(msg);
      toast(msg, "success");
      router.refresh();
    });
  }

  // Free, key-less full catalogue from the open-source dataset.
  function importFree() {
    startSeeding(async () => {
      let offset = 0;
      let total = 0;
      for (let guard = 0; guard < 50; guard++) {
        const res = await importFreeCatalog(offset);
        if (!res.ok) {
          toast(res.error ?? "Import failed", "error");
          setLastResult(res.error ?? null);
          return;
        }
        total += res.imported;
        setLastResult(`Importing free library… ${res.nextOffset}/${res.total} processed`);
        if (!res.hasMore) break;
        offset = res.nextOffset;
      }
      const msg = `Imported ${total} exercises from the free open-source library.`;
      setLastResult(msg);
      toast(msg, "success");
      router.refresh();
    });
  }

  function rehost() {
    startSeeding(async () => {
      let offset = 0;
      let totalRehosted = 0;
      let totalFailed = 0;
      // Loop the batches until the server reports there's nothing left.
      for (let guard = 0; guard < 200; guard++) {
        const res = await rehostExerciseGifs(offset);
        if (!res.ok) {
          toast(res.error ?? "Re-host failed", "error");
          return;
        }
        totalRehosted += res.rehosted;
        totalFailed += res.failed ?? 0;
        setLastResult(
          `Re-hosting… ${res.nextOffset}/${res.total} processed` +
            (totalFailed ? ` (${totalFailed} failed)` : "")
        );
        if (!res.hasMore) break;
        offset = res.nextOffset;
      }
      const msg =
        `Re-hosted ${totalRehosted} GIF${totalRehosted === 1 ? "" : "s"}.` +
        (totalFailed
          ? ` ${totalFailed} couldn't be fetched — check the ExerciseDB API key/subscription.`
          : "");
      setLastResult(msg);
      toast(msg, totalFailed && !totalRehosted ? "error" : "success");
      router.refresh();
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

      {/* Bulk: import the whole library in one go. */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-active)] bg-[var(--accent-muted)] p-3">
        <Button onClick={importAll} disabled={disabled || pending || seeding} className="gap-1.5">
          <Library className="h-4 w-4" />
          {seeding ? "Importing…" : "Import entire ExerciseDB"}
        </Button>
        <button
          onClick={importFree}
          disabled={pending || seeding}
          title="Import ~870 exercises from the open-source dataset — no API key or quota used"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          <Download className="h-4 w-4 text-[var(--accent-primary)]" />
          {seeding ? "Working…" : "Free library (no key)"}
        </button>
        <span className="text-xs text-[var(--text-muted)]">
          Full catalogue. ExerciseDB uses your RapidAPI quota (then re-host GIFs);
          the free library uses none.
        </span>
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
