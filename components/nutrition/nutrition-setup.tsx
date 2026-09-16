"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Ruler, SlidersHorizontal, Check, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_LEVELS,
  GOAL_OPTIONS,
  computeNutritionPlan,
  type ActivityLevel,
  type NutritionGoal,
  type PlanMethod,
  type Sex,
} from "@/lib/nutrition";
import { saveNutritionTargets } from "@/lib/actions/nutrition";

export interface SetupScan {
  scan_date: string | null;
  weight_kg: number | null;
  lean_mass_kg: number | null;
  body_fat_pct: number | null;
}

export interface SetupProfile {
  age: number | null;
  weightKg: number | null;
}

export function NutritionSetup({
  scan,
  profile,
  onClose,
}: {
  scan: SetupScan | null;
  profile: SetupProfile;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const hasScan = Boolean(scan?.lean_mass_kg && scan.lean_mass_kg > 20);

  // null = still on the method chooser
  const [method, setMethod] = useState<PlanMethod | null>(null);
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<NutritionGoal>("maintain");

  // Manual-stats inputs (pre-filled from what we know).
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState(profile.age ? String(profile.age) : "");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState(
    profile.weightKg ? String(Math.round(profile.weightKg)) : ""
  );

  const plan = useMemo(() => {
    if (!method) return null;
    if (method === "body_comp") {
      return computeNutritionPlan({
        method: "body_comp",
        weightKg: scan?.weight_kg ?? null,
        leanMassKg: scan?.lean_mass_kg ?? null,
        activity,
        goal,
      });
    }
    return computeNutritionPlan({
      method: "stats",
      sex,
      age: Number(age) || null,
      heightCm: Number(height) || null,
      weightKg: Number(weight) || null,
      activity,
      goal,
    });
  }, [method, scan, activity, goal, sex, age, height, weight]);

  function save() {
    if (!plan) return;
    startTransition(async () => {
      const res = await saveNutritionTargets({
        calories: plan.calories,
        protein_g: plan.protein_g,
        carbs_g: plan.carbs_g,
        fat_g: plan.fat_g,
      });
      if (res.ok) {
        toast("Your daily targets are set.", "success");
        onClose();
        router.refresh();
      } else {
        toast(res.error ?? "Could not save", "error");
      }
    });
  }

  const scanDate = scan?.scan_date
    ? new Date(scan.scan_date).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[var(--radius-card)] bg-[var(--surface-primary)] sm:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] p-4">
          {method && (
            <button
              onClick={() => setMethod(null)}
              aria-label="Back"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <p className="flex-1 font-bold">Set up your macros</p>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!method ? (
            // ---- Method chooser -------------------------------------------
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-secondary)]">
                We&apos;ll work out your daily calories and protein from your
                information. Pick how you&apos;d like to start.
              </p>

              <button
                onClick={() => hasScan && setMethod("body_comp")}
                disabled={!hasScan}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition",
                  hasScan
                    ? "border-[var(--border-active)] bg-[var(--accent-muted)] hover:brightness-105"
                    : "cursor-not-allowed border-[var(--border-subtle)] opacity-60"
                )}
              >
                <span className="mt-0.5 rounded-xl bg-[var(--accent-primary)]/15 p-2 text-[var(--accent-primary)]">
                  <Ruler className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    Use body composition result
                    <Sparkles className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
                    {hasScan
                      ? `From your scan${scanDate ? ` on ${scanDate}` : ""} · ${scan!.lean_mass_kg!.toFixed(
                          1
                        )} kg lean. Most accurate.`
                      : "Add a DEXA / InBody scan first to use this."}
                  </span>
                </span>
              </button>

              <button
                onClick={() => setMethod("stats")}
                className="flex w-full items-start gap-3 rounded-2xl border border-[var(--border-subtle)] p-4 text-left transition hover:border-[var(--border-active)]"
              >
                <span className="mt-0.5 rounded-xl bg-[var(--surface-secondary)] p-2 text-[var(--text-secondary)]">
                  <SlidersHorizontal className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Enter my details</span>
                  <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
                    Height, weight, age and activity — a solid estimate.
                  </span>
                </span>
              </button>
            </div>
          ) : (
            // ---- Configure + preview --------------------------------------
            <div className="space-y-5">
              {method === "body_comp" ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    From your scan{scanDate ? ` · ${scanDate}` : ""}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-3 text-center">
                    <ScanStat label="Weight" value={scan?.weight_kg != null ? `${Number(scan.weight_kg).toFixed(1)} kg` : "—"} />
                    <ScanStat label="Lean mass" value={scan?.lean_mass_kg != null ? `${Number(scan.lean_mass_kg).toFixed(1)} kg` : "—"} />
                    <ScanStat label="Body fat" value={scan?.body_fat_pct != null ? `${Number(scan.body_fat_pct).toFixed(1)}%` : "—"} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(["male", "female"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSex(s)}
                        className={cn(
                          "h-11 rounded-xl border text-sm font-medium capitalize",
                          sex === s
                            ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                            : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <NumField label="Age" value={age} onChange={setAge} />
                    <NumField label="Height (cm)" value={height} onChange={setHeight} />
                    <NumField label="Weight (kg)" value={weight} onChange={setWeight} />
                  </div>
                  {method === "stats" && (!Number(height) || !Number(weight)) && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Enter your height and weight to see your targets.
                    </p>
                  )}
                </div>
              )}

              {/* Activity */}
              <div>
                <p className="mb-2 text-sm font-semibold">Activity level</p>
                <div className="space-y-1.5">
                  {ACTIVITY_LEVELS.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => setActivity(a.value)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm",
                        activity === a.value
                          ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
                          : "border-[var(--border-subtle)]"
                      )}
                    >
                      <span>
                        <span className="font-medium">{a.label}</span>
                        <span className="ml-2 text-xs text-[var(--text-muted)]">{a.hint}</span>
                      </span>
                      {activity === a.value && (
                        <Check className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal */}
              <div>
                <p className="mb-2 text-sm font-semibold">Your goal</p>
                <div className="grid grid-cols-3 gap-2">
                  {GOAL_OPTIONS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setGoal(g.value)}
                      className={cn(
                        "rounded-xl border p-2.5 text-center",
                        goal === g.value
                          ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
                          : "border-[var(--border-subtle)]"
                      )}
                    >
                      <span className="block text-sm font-medium">{g.label}</span>
                      <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                        {g.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Result */}
              {plan ? (
                <div className="rounded-2xl border border-[var(--border-active)] bg-[var(--surface-secondary)] p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-semibold">Your daily targets</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      BMR {plan.bmr} · TDEE {plan.tdee} kcal
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <Target label="Calories" value={plan.calories} />
                    <Target label="Protein" value={`${plan.protein_g}g`} tone="accent" />
                    <Target label="Carbs" value={`${plan.carbs_g}g`} />
                    <Target label="Fat" value={`${plan.fat_g}g`} />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
                    {plan.explanation}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-4 text-center text-sm text-[var(--text-muted)]">
                  Fill in your details above to see your targets.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {method && (
          <div className="border-t border-[var(--border-subtle)] p-4">
            <Button onClick={save} disabled={pending || !plan} size="lg" className="w-full">
              {pending
                ? "Saving…"
                : method === "body_comp"
                  ? "Use body composition result"
                  : "Save my targets"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ScanStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
      {label}
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--border-active)] focus:outline-none"
      />
    </label>
  );
}

function Target({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "accent";
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-primary)] p-2">
      <p
        className={cn(
          "text-base font-bold tabular-nums",
          tone === "accent" ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
        )}
      >
        {value}
      </p>
      <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
