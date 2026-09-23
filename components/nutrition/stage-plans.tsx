"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Check, Beef, Flame, Dumbbell, Salad } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { STAGE_PLANS, computeStageTargets, type StageId } from "@/lib/nutrition-plans";
import { saveNutritionTargets } from "@/lib/actions/nutrition";
import { useRouter } from "next/navigation";

const STAGE_ICON: Record<StageId, typeof Dumbbell> = {
  gain: Dumbbell,
  maintain: Salad,
  lose: Flame,
};

/**
 * Training-stage nutrition presets. Each card explains the calorie/macro
 * strategy for a phase (build / maintain / cut) and can set the member's daily
 * targets from their bodyweight in one tap.
 */
export function StagePlans({ weightKg }: { weightKg: number | null }) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState<StageId | null>(null);
  const [applying, setApplying] = useState<StageId | null>(null);
  const [, startTransition] = useTransition();

  function apply(id: StageId) {
    const plan = STAGE_PLANS.find((p) => p.id === id);
    if (!plan || !weightKg) return;
    const targets = computeStageTargets(weightKg, plan);
    setApplying(id);
    startTransition(async () => {
      const res = await saveNutritionTargets(targets);
      if (res.ok) {
        toast(`${plan.name} targets applied.`, "success");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't apply — try again.", "error");
      }
      setApplying(null);
    });
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">Nutrition by training stage</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Match your food to your phase. Tap a stage to set your daily targets from
        your bodyweight — fine-tune anytime in “Set up macros”.
      </p>

      <div className="mt-4 space-y-3">
        {STAGE_PLANS.map((plan) => {
          const Icon = STAGE_ICON[plan.id];
          const isOpen = open === plan.id;
          const preview = weightKg ? computeStageTargets(weightKg, plan) : null;
          return (
            <div
              key={plan.id}
              className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
            >
              <button
                onClick={() => setOpen(isOpen ? null : plan.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
                aria-expanded={isOpen}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-muted)] text-[var(--accent-primary)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent-primary)]">
                      {plan.stage}
                    </span>
                  </span>
                  <span className="block font-semibold leading-tight">{plan.name}</span>
                  <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                    {plan.calorieStance}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>

              {isOpen && (
                <div className="border-t border-[var(--border-subtle)] p-4">
                  <p className="text-sm text-[var(--text-secondary)]">{plan.summary}</p>

                  {preview && (
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                      <Macro label="Calories" value={preview.calories} />
                      <Macro label="Protein" value={`${preview.protein_g}g`} accent />
                      <Macro label="Carbs" value={`${preview.carbs_g}g`} />
                      <Macro label="Fat" value={`${preview.fat_g}g`} />
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Beef className="h-3.5 w-3.5" /> {plan.proteinPerKg} g protein / kg
                    </span>
                    <span>Fat ~{Math.round(plan.fatPct * 100)}% of calories</span>
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {plan.tips.map((tip, i) => (
                      <li key={i} className="flex gap-2 text-xs text-[var(--text-secondary)]">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                    Pairs with: {plan.pairsWith}
                  </p>

                  <button
                    onClick={() => apply(plan.id)}
                    disabled={!weightKg || applying !== null}
                    className="mt-4 w-full rounded-2xl bg-[var(--accent-primary)] py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-50"
                  >
                    {applying === plan.id
                      ? "Applying…"
                      : weightKg
                        ? "Apply to my targets"
                        : "Add your bodyweight to apply"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Macro({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-secondary)] p-2">
      <p
        className={cn(
          "text-base font-bold tabular-nums",
          accent ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
        )}
      >
        {value}
      </p>
      <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
