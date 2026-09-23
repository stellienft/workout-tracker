"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { MEAL_PLANS, planTotals, type PlanTag } from "@/lib/meal-plans";
import { addMealPlanToDay } from "@/lib/actions/nutrition";

const TAGS: (PlanTag | "All")[] = [
  "All",
  "Bulk",
  "Gain",
  "Maintain",
  "Cut",
  "Vegetarian",
  "Athlete",
];

const TAG_TINT: Record<PlanTag, string> = {
  Bulk: "bg-orange-500/15 text-orange-400",
  Gain: "bg-[var(--accent-muted)] text-[var(--accent-primary)]",
  Maintain: "bg-blue-500/15 text-blue-400",
  Cut: "bg-teal-500/15 text-teal-400",
  Vegetarian: "bg-green-500/15 text-green-400",
  Athlete: "bg-purple-500/15 text-purple-400",
};

export function MealPlansClient({ date, today }: { date: string; today: string }) {
  const toast = useToast();
  const router = useRouter();
  const [tag, setTag] = useState<(typeof TAGS)[number]>("All");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isToday = date === today;
  const plans = MEAL_PLANS.filter((p) => tag === "All" || p.tag === tag);

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

  return (
    <div>
      <div className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1">
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
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums">{m.calories}</p>
                          <p className="text-[11px] text-[var(--accent-primary)]">{m.protein_g}g P</p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => add(plan.id)}
                    disabled={adding !== null}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-50"
                  >
                    {adding === plan.id ? (
                      <>
                        <Check className="h-4 w-4" /> Adding…
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Add this day to my diary
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-[var(--text-muted)]">
                    Adds all {plan.meals.length} meals to {isToday ? "today" : date}. Edit or remove
                    any of them in your diary.
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
