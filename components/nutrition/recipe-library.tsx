"use client";

import { useMemo, useState } from "react";
import { Search, Clock, X, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { RECIPE_CATEGORIES } from "@/lib/nutrition";

interface Recipe {
  id: string;
  title: string;
  category: string;
  image_url: string | null;
  description: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  servings: number;
  prep_minutes: number;
  tags: string[];
  ingredients: string[];
  steps: string[];
}

export function RecipeLibrary({ recipes }: { recipes: Recipe[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [open, setOpen] = useState<Recipe | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return recipes.filter((r) => {
      if (cat && r.category !== cat) return false;
      if (
        query &&
        !r.title.toLowerCase().includes(query) &&
        !r.tags.some((t) => t.includes(query))
      )
        return false;
      return true;
    });
  }, [recipes, q, cat]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Recipes</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {recipes.length} recipes across {RECIPE_CATEGORIES.length} categories.
      </p>

      <div className="mt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search recipes or tags…"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] pl-9 pr-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={!cat} onClick={() => setCat(null)} label="All" />
          {RECIPE_CATEGORIES.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)} label={c} />
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((r) => (
          <button
            key={r.id}
            onClick={() => setOpen(r)}
            className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.image_url ?? ""}
              alt={r.title}
              className="h-28 w-full bg-[var(--surface-secondary)] object-cover"
            />
            <div className="p-3">
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--accent-primary)]">
                {r.category}
              </span>
              <p className="mt-0.5 line-clamp-2 text-sm font-medium">{r.title}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <Clock className="h-3 w-3" /> {r.prep_minutes}m · {r.calories} kcal ·{" "}
                {r.protein_g}g P
              </p>
            </div>
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="mt-10 text-center text-sm text-[var(--text-muted)]">
          No recipes match.
        </p>
      )}

      {open && <RecipeDetail recipe={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function RecipeDetail({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[var(--radius-card)] bg-[var(--surface-primary)] sm:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recipe.image_url ?? ""}
            alt={recipe.title}
            className="h-44 w-full bg-[var(--surface-secondary)] object-cover"
          />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--accent-primary)]">
            {recipe.category}
          </span>
          <h2 className="mt-1 text-xl font-bold">{recipe.title}</h2>
          {recipe.description && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{recipe.description}</p>
          )}

          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            {[
              ["Cals", recipe.calories, <Flame key="f" className="mx-auto h-3.5 w-3.5" />],
              ["Protein", `${recipe.protein_g}g`, null],
              ["Carbs", `${recipe.carbs_g}g`, null],
              ["Fat", `${recipe.fat_g}g`, null],
            ].map(([label, val]) => (
              <div
                key={label as string}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-2"
              >
                <p className="text-sm font-bold text-[var(--accent-primary)]">{val as string}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{label as string}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
            per serving · {recipe.prep_minutes} min · makes {recipe.servings}
          </p>

          {recipe.ingredients.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-bold">Ingredients</h3>
              <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex gap-2 capitalize">
                    <span className="text-[var(--accent-primary)]">·</span> {ing}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recipe.steps.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-bold">Method</h3>
              <ol className="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-semibold text-[var(--accent-primary)]">{i + 1}.</span>{" "}
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs",
        active
          ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
          : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
      )}
    >
      {label}
    </button>
  );
}
