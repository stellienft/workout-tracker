"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Search,
  Trash2,
  Clock,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { MEAL_SLOTS, RECIPE_CATEGORIES, type MacroTargets } from "@/lib/nutrition";
import {
  addRecipeToMeal,
  addCustomFood,
  deleteMealEntry,
  saveNutritionTargets,
} from "@/lib/actions/nutrition";

interface Entry {
  id: string;
  meal: string;
  title: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  servings: number;
}
interface Recipe {
  id: string;
  title: string;
  category: string;
  image_url: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  prep_minutes: number;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

function shiftDate(date: string, days: number) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function NutritionDashboard({
  date,
  targets,
  suggested,
  hasSavedTargets,
  entries,
  recipes,
  favoriteIds,
}: {
  date: string;
  targets: MacroTargets;
  suggested: MacroTargets;
  hasSavedTargets: boolean;
  entries: Entry[];
  recipes: Recipe[];
  favoriteIds: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [addFor, setAddFor] = useState<string | null>(null);
  const [editingTargets, setEditingTargets] = useState(false);

  const totals = useMemo(() => {
    return entries.reduce(
      (t, e) => ({
        calories: t.calories + e.calories,
        protein_g: t.protein_g + e.protein_g,
        carbs_g: t.carbs_g + e.carbs_g,
        fat_g: t.fat_g + e.fat_g,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
  }, [entries]);

  const isToday = date === new Date().toISOString().slice(0, 10);
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  function go(days: number) {
    router.push(`/nutrition?date=${shiftDate(date, days)}`);
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteMealEntry(id);
      if (res.ok) router.refresh();
      else toast(res.error ?? "Could not remove", "error");
    });
  }

  return (
    <div className="space-y-6">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => go(-1)}
          className="rounded-xl border border-[var(--border-subtle)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-semibold">{isToday ? "Today" : dateLabel}</p>
          {!isToday && <p className="text-xs text-[var(--text-muted)]">{dateLabel}</p>}
        </div>
        <button
          onClick={() => go(1)}
          className="rounded-xl border border-[var(--border-subtle)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Next day"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Macro summary */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Daily macros</p>
          <button
            onClick={() => setEditingTargets((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Targets
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MacroBar label="Calories" unit="kcal" value={totals.calories} target={targets.calories} />
          <MacroBar label="Protein" unit="g" value={totals.protein_g} target={targets.protein_g} />
          <MacroBar label="Carbs" unit="g" value={totals.carbs_g} target={targets.carbs_g} />
          <MacroBar label="Fat" unit="g" value={totals.fat_g} target={targets.fat_g} />
        </div>

        {editingTargets && (
          <TargetsEditor
            targets={targets}
            suggested={suggested}
            hasSaved={hasSavedTargets}
            onClose={() => setEditingTargets(false)}
          />
        )}
      </div>

      {/* Meals */}
      <div className="space-y-4">
        {MEAL_SLOTS.map((slot) => {
          const slotEntries = entries.filter((e) => e.meal === slot);
          return (
            <div
              key={slot}
              className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
            >
              <div className="flex items-center justify-between p-4">
                <p className="font-semibold">{MEAL_LABELS[slot]}</p>
                <button
                  onClick={() => setAddFor(slot)}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--border-active)]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              {slotEntries.length > 0 && (
                <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                  {slotEntries.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e.title}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {e.calories} kcal · {e.protein_g}p / {e.carbs_g}c / {e.fat_g}f
                          {e.servings !== 1 ? ` · ${e.servings}×` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(e.id)}
                        disabled={pending}
                        aria-label="Remove"
                        className="text-[var(--text-muted)] hover:text-[var(--danger)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {addFor && (
        <AddModal
          date={date}
          meal={addFor}
          recipes={recipes}
          favoriteIds={favoriteIds}
          onClose={() => setAddFor(null)}
          onDone={() => {
            setAddFor(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function MacroBar({
  label,
  unit,
  value,
  target,
}: {
  label: string;
  unit: string;
  value: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const over = value > target && target > 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
        <span className="text-xs text-[var(--text-muted)]">
          {value}/{target}
          {unit === "g" ? "g" : ""}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--surface-secondary)]">
        <div
          className={cn(
            "h-full rounded-full",
            over ? "bg-[var(--danger)]" : "bg-[var(--accent-primary)]"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TargetsEditor({
  targets,
  suggested,
  hasSaved,
  onClose,
}: {
  targets: MacroTargets;
  suggested: MacroTargets;
  hasSaved: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [t, setT] = useState<MacroTargets>(targets);

  function set(key: keyof MacroTargets, v: string) {
    setT((cur) => ({ ...cur, [key]: Number(v) || 0 }));
  }
  function save() {
    startTransition(async () => {
      const res = await saveNutritionTargets(t);
      if (res.ok) {
        toast("Targets saved.", "success");
        onClose();
        router.refresh();
      } else {
        toast(res.error ?? "Could not save", "error");
      }
    });
  }

  const fields: [keyof MacroTargets, string][] = [
    ["calories", "Calories"],
    ["protein_g", "Protein (g)"],
    ["carbs_g", "Carbs (g)"],
    ["fat_g", "Fat (g)"],
  ];

  return (
    <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-4">
      {!hasSaved && (
        <p className="text-xs text-[var(--text-muted)]">
          Suggested from your goal and body weight — tweak anything and save.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {fields.map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
            {label}
            <input
              type="number"
              value={t[key]}
              onChange={(e) => set(key, e.target.value)}
              className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)]"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={pending} size="sm">
          {pending ? "Saving…" : "Save targets"}
        </Button>
        <button
          onClick={() => setT(suggested)}
          className="rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Use suggested
        </button>
      </div>
    </div>
  );
}

function AddModal({
  date,
  meal,
  recipes,
  favoriteIds,
  onClose,
  onDone,
}: {
  date: string;
  meal: string;
  recipes: Recipe[];
  favoriteIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"recipes" | "custom">("recipes");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(1);
  const favSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const FAV = "★ Favourites";

  // Custom
  const [cTitle, setCTitle] = useState("");
  const [cKcal, setCKcal] = useState("");
  const [cP, setCP] = useState("");
  const [cC, setCC] = useState("");
  const [cF, setCF] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return recipes.filter((r) => {
      if (cat === FAV && !favSet.has(r.id)) return false;
      if (cat && cat !== FAV && r.category !== cat) return false;
      if (query && !r.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [recipes, q, cat, favSet]);

  // Infinite scroll: render a growing window instead of the whole list at once.
  const PAGE = 12;
  const [visible, setVisible] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset the window whenever the filters change or the list shrinks.
  useEffect(() => {
    setVisible(PAGE);
  }, [q, cat]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible((v) => (v < filtered.length ? v + PAGE : v));
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [filtered.length]);

  const shown = filtered.slice(0, visible);

  function addRecipe() {
    if (!selected) return;
    startTransition(async () => {
      const res = await addRecipeToMeal({
        date,
        meal,
        recipeId: selected.id,
        servings,
      });
      if (res.ok) {
        toast("Added to " + meal, "success");
        onDone();
      } else {
        toast(res.error ?? "Could not add", "error");
      }
    });
  }

  function addCustom() {
    startTransition(async () => {
      const res = await addCustomFood({
        date,
        meal,
        title: cTitle,
        calories: Number(cKcal) || 0,
        protein_g: Number(cP) || 0,
        carbs_g: Number(cC) || 0,
        fat_g: Number(cF) || 0,
      });
      if (res.ok) {
        toast("Added to " + meal, "success");
        onDone();
      } else {
        toast(res.error ?? "Could not add", "error");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[var(--radius-card)] bg-[var(--surface-primary)] sm:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
          <p className="font-bold capitalize">Add to {meal}</p>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {selected ? (
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.image_url ?? ""}
                alt=""
                className="h-16 w-16 rounded-xl bg-[var(--surface-secondary)] object-cover"
              />
              <div>
                <p className="font-semibold">{selected.title}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {selected.calories} kcal · {selected.protein_g}p / {selected.carbs_g}c /{" "}
                  {selected.fat_g}f per serving
                </p>
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm">
              Servings
              <input
                type="number"
                min={0.25}
                step={0.25}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="h-11 w-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)]"
              />
            </label>
            <div className="flex gap-2">
              <Button onClick={addRecipe} disabled={pending} size="lg" className="flex-1">
                {pending ? "Adding…" : "Add"}
              </Button>
              <Button onClick={() => setSelected(null)} variant="secondary" size="lg">
                Back
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 border-b border-[var(--border-subtle)] p-3">
              {(["recipes", "custom"] as const).map((tb) => (
                <button
                  key={tb}
                  onClick={() => setTab(tb)}
                  className={cn(
                    "flex-1 rounded-xl py-2 text-sm font-medium capitalize",
                    tab === tb
                      ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                      : "text-[var(--text-secondary)]"
                  )}
                >
                  {tb === "custom" ? "Quick add" : "Recipes"}
                </button>
              ))}
            </div>

            {tab === "recipes" ? (
              <>
                <div className="space-y-2 border-b border-[var(--border-subtle)] p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search recipes…"
                      className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] pl-9 pr-3 text-sm text-[var(--text-primary)] focus:border-[var(--border-active)] focus:outline-none"
                    />
                  </div>
                  <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                    <FilterChip active={!cat} onClick={() => setCat(null)} label="All" />
                    <FilterChip
                      active={cat === FAV}
                      onClick={() => setCat(cat === FAV ? null : FAV)}
                      label={FAV}
                    />
                    {RECIPE_CATEGORIES.map((c) => (
                      <FilterChip
                        key={c}
                        active={cat === c}
                        onClick={() => setCat(cat === c ? null : c)}
                        label={c}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="grid grid-cols-2 gap-3">
                    {shown.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSelected(r);
                          setServings(1);
                        }}
                        className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-left"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.image_url ?? ""}
                          alt=""
                          loading="lazy"
                          className="h-24 w-full bg-[var(--surface-elevated)] object-cover"
                        />
                        <div className="p-2.5">
                          <p className="line-clamp-2 text-xs font-medium">{r.title}</p>
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                            <Clock className="h-3 w-3" /> {r.prep_minutes}m · {r.calories} kcal ·{" "}
                            {r.protein_g}g P
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {filtered.length === 0 && (
                    <p className="p-6 text-center text-sm text-[var(--text-muted)]">
                      No recipes match.
                    </p>
                  )}
                  {visible < filtered.length && (
                    <div
                      ref={sentinelRef}
                      className="flex items-center justify-center py-4 text-xs text-[var(--text-muted)]"
                    >
                      Loading more…
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3 overflow-y-auto p-4">
                <input
                  value={cTitle}
                  onChange={(e) => setCTitle(e.target.value)}
                  placeholder="Food name"
                  className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--border-active)] focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Calories", cKcal, setCKcal],
                    ["Protein (g)", cP, setCP],
                    ["Carbs (g)", cC, setCC],
                    ["Fat (g)", cF, setCF],
                  ].map(([label, val, setter]) => (
                    <label
                      key={label as string}
                      className="flex flex-col gap-1 text-xs text-[var(--text-muted)]"
                    >
                      {label as string}
                      <input
                        type="number"
                        value={val as string}
                        onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                        className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)]"
                      />
                    </label>
                  ))}
                </div>
                <Button
                  onClick={addCustom}
                  disabled={pending || cTitle.trim().length < 1}
                  size="lg"
                  className="w-full"
                >
                  {pending ? "Adding…" : "Add food"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FilterChip({
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
        "shrink-0 rounded-full border px-3 py-1 text-xs",
        active
          ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
          : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
      )}
    >
      {label}
    </button>
  );
}
