"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  importRecipes,
  seedStarterRecipes,
  clearAllRecipes,
} from "@/lib/actions/recipes-admin";

const SUGGESTIONS = [
  "chicken",
  "beef",
  "salmon",
  "pasta",
  "curry",
  "breakfast",
  "salad",
  "dessert",
];

export function RecipeImport() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [seeding, startSeeding] = useTransition();
  const [clearing, startClearing] = useTransition();
  const [query, setQuery] = useState("");
  const [number, setNumber] = useState(15);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const busy = pending || seeding || clearing;

  function seed() {
    startSeeding(async () => {
      const res = await seedStarterRecipes();
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

  function run() {
    if (query.trim().length < 2) {
      toast("Enter a search term.", "error");
      return;
    }
    startTransition(async () => {
      const res = await importRecipes({ query: query.trim(), number });
      if (res.ok) {
        const msg =
          "message" in res && res.message
            ? res.message
            : `Imported ${res.imported} recipe${res.imported === 1 ? "" : "s"}.`;
        setLastResult(msg);
        toast(msg, "success");
        router.refresh();
      } else {
        toast(res.error ?? "Import failed", "error");
      }
    });
  }

  function clearAll() {
    startClearing(async () => {
      const res = await clearAllRecipes();
      if (res.ok) {
        const msg = `Removed ${res.removed} recipe${res.removed === 1 ? "" : "s"}.`;
        setLastResult(msg);
        toast(msg, "success");
        setConfirmClear(false);
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't clear recipes", "error");
      }
    });
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div>
        <p className="font-semibold">Import from TheMealDB</p>
        <p className="text-sm text-[var(--text-secondary)]">
          Real recipes with high-quality photos, ingredients and steps. Imports
          dedupe, so re-running tops up the library. Note: TheMealDB doesn&apos;t
          provide macros, so recipes show ingredients &amp; steps rather than
          calorie counts.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Search e.g. chicken, salmon, curry"
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
        <select
          value={number}
          onChange={(e) => setNumber(Number(e.target.value))}
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm"
        >
          {[5, 10, 15, 20, 25].map((n) => (
            <option key={n} value={n}>
              {n} recipes
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setQuery(s)}
            className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--border-active)]"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={busy} className="gap-1.5">
          <Download className="h-4 w-4" />
          {pending ? "Importing…" : "Import"}
        </Button>
        <button
          onClick={seed}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
          {seeding ? "Seeding…" : "Seed a starter set"}
        </button>
        {lastResult && (
          <span className="text-sm text-[var(--text-secondary)]">{lastResult}</span>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        &quot;Seed a starter set&quot; pulls a spread across every category
        (~90 recipes) in one go.
      </p>

      {/* Danger zone: wipe the library. */}
      <div className="mt-2 border-t border-[var(--border-subtle)] pt-4">
        {confirmClear ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)]">
              Remove every recipe? Your logged meals keep their macros.
            </span>
            <button
              onClick={clearAll}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {clearing ? "Removing…" : "Yes, remove all"}
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              disabled={busy}
              className="text-sm text-[var(--text-secondary)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--danger)] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Remove all recipes
          </button>
        )}
      </div>
    </div>
  );
}
