"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Check, CalendarRange, BookOpen } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { MEAL_PLANS, planTotals, type PlanTag } from "@/lib/meal-plans";
import { addMealPlanToDay, addMealPlanWeek } from "@/lib/actions/nutrition";

// A rough recipe-search keyword from a meal title (the main food), for the
// "find recipes like this" link.
const STOP = new Set([
  "with","and","the","of","a","an","made","water","small","big","light","mixed",
  "tinned","pre","cooked","microwave","overnight","protein","two","dairy-free",
  "wholegrain","low-fat","fresh","serve","handful",
]);
function mealKeyword(title: string): string {
  const words = title.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  return words.find((w) => w.length > 2 && !STOP.has(w)) ?? words[0] ?? "";
}

const TAGS: (PlanTag | "All")[] = [
  "All",
  "Bulk",
  "Gain",
  "Maintain",
  "Cut",
  "Vegetarian",
  "Dairy-free",
  "Budget",
  "Quick",
  "Athlete",
];

const TAG_TINT: Record<PlanTag, string> = {
  Bulk: "bg-orange-500/15 text-orange-400",
  Gain: "bg-[var(--accent-muted)] text-[var(--accent-primary)]",
  Maintain: "bg-blue-500/15 text-blue-400",
  Cut: "bg-teal-500/15 text-teal-400",
  Vegetarian: "bg-green-500/15 text-green-400",
  Athlete: "bg-purple-500/15 text-purple-400",
  "Dairy-free": "bg-cyan-500/15 text-cyan-400",
  Budget: "bg-amber-500/15 text-amber-400",
  Quick: "bg-rose-500/15 text-rose-400",
};

export function MealPlansClient({
  today,
  targetCalories,
}: {
  today: string;
  targetCalories: number | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const [tag, setTag] = useState<(typeof TAGS)[number]>("All");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [addingWeek, setAddingWeek] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [, startTransition] = useTransition();

  const isToday = date === today;
  const plans = MEAL_PLANS.filter((p) => tag === "All" || p.tag === tag);

  // The plan whose day total is closest to the member's saved calorie target.
  const bestMatchId = targetCalories
    ? MEAL_PLANS.reduce<{ id: string; diff: number } | null>((best, p) => {
        const diff = Math.abs(planTotals(p).calories - targetCalories);
        return !best || diff < best.diff ? { id: p.id, diff } : best;
      }, null)?.id ?? null
    : null;

  function add(planId: string) {
    setAdding(planId);
    startTransition(async () => {
      const res = await addMealPlanToDay({ planId, date });
      if (res.ok) {
        toast(`Added to your diary${isToday ? " for today" : ""}.`, "success");
        router.push("/nutrition");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't add — try again.", "error");
        setAdding(null);
      }
    });
  }

  function addWeek(planId: string) {
    setAddingWeek(planId);
    startTransition(async () => {
      const res = await addMealPlanWeek({ planId, startDate: date });
      if (res.ok) {
        toast(`Added to 7 days from ${isToday ? "today" : date}.`, "success");
        router.push("/nutrition");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't add — try again.", "error");
        setAddingWeek(null);
      }
    });
  }

  return (
    <div>
      {/* Which day to add to. */}
      <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3 text-sm">
        <span className="text-[var(--text-secondary)]">Add to</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value || today)}
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>

      <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1">
        {TAGS.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors",
              tag === t
                ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {plans.map((plan) => {
          const totals = planTotals(plan);
          const isOpen = open === plan.id;
          return (
            <div
              key={plan.id}
              className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
            >
              <button
                onClick={() => setOpen(isOpen ? null : plan.id)}
                className="w-full p-4 text-left"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      TAG_TINT[plan.tag]
                    )}
                  >
                    {plan.tag}
                  </span>
                  {plan.id === bestMatchId && (
                    <span className="rounded-full bg-[var(--accent-primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent-ink)]">
                      Best match
                    </span>
                  )}
                  <h3 className="flex-1 font-semibold leading-tight">{plan.name}</h3>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </div>
                <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{plan.summary}</p>
                <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {totals.calories.toLocaleString()} kcal
                  </span>
                  <span className="text-[var(--accent-primary)]">{totals.protein_g}g protein</span>
                  <span>{totals.carbs_g}g carbs</span>
                  <span>{totals.fat_g}g fat</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-[var(--border-subtle)] p-4">
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {plan.meals.map((m, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            {m.label}
                          </p>
                          <p className="text-sm">{m.title}</p>
                          <Link
                            href={`/nutrition/recipes?q=${encodeURIComponent(mealKeyword(m.title))}`}
                            className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[var(--accent-primary)] hover:underline"
                          >
                            <BookOpen className="h-3 w-3" /> Find recipes
                          </Link>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums">{m.calories}</p>
                          <p className="text-[11px] text-[var(--accent-primary)]">{m.protein_g}g P</p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => add(plan.id)}
                      disabled={adding !== null || addingWeek !== null}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-50"
                    >
                      {adding === plan.id ? (
                        <>
                          <Check className="h-4 w-4" /> Adding…
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" /> Add this day
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => addWeek(plan.id)}
                      disabled={adding !== null || addingWeek !== null}
                      className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-[var(--border-subtle)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-50"
                    >
                      <CalendarRange className="h-4 w-4" />
                      {addingWeek === plan.id ? "Adding…" : "7 days"}
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[11px] text-[var(--text-muted)]">
                    Adds all {plan.meals.length} meals to {isToday ? "today" : date} — or the whole
                    week. Edit or remove any of them in your diary.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
