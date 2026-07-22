"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { RECIPE_CATEGORIES } from "@/lib/nutrition";
import { importSpoonacularRecipes } from "@/lib/actions/recipes-admin";

const SUGGESTIONS = [
  "high protein chicken",
  "vegan bowl",
  "low carb dinner",
  "overnight oats",
  "protein smoothie",
  "salmon",
  "chickpea salad",
  "healthy dessert",
];

export function RecipeImport({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [number, setNumber] = useState(10);
  const [lastResult, setLastResult] = useState<string | null>(null);

  function run() {
    if (query.trim().length < 2) {
      toast("Enter a search term.", "error");
      return;
    }
    startTransition(async () => {
      const res = await importSpoonacularRecipes({
        query: query.trim(),
        category: category || undefined,
        number,
      });
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

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div>
        <p className="font-semibold">Import from Spoonacular</p>
        <p className="text-sm text-[var(--text-secondary)]">
          Search real recipes with photos and verified macros. Imports dedupe, so
          re-running a search tops up the library.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Search e.g. high protein chicken"
          disabled={disabled}
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none disabled:opacity-50"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={disabled}
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm disabled:opacity-50"
        >
          <option value="">Auto category</option>
          {RECIPE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={number}
          onChange={(e) => setNumber(Number(e.target.value))}
          disabled={disabled}
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm disabled:opacity-50"
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
            disabled={disabled}
            className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--border-active)] disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={disabled || pending} className="gap-1.5">
          <Download className="h-4 w-4" />
          {pending ? "Importing…" : "Import"}
        </Button>
        {lastResult && (
          <span className="text-sm text-[var(--text-secondary)]">{lastResult}</span>
        )}
      </div>
    </div>
  );
}
