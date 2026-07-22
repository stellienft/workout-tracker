"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/ui/cover-image";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "@/lib/actions/onboarding";
import type { FitnessGoal } from "@/lib/types";
import { Check } from "lucide-react";

const EQUIPMENT = [
  "dumbbell",
  "barbell",
  "machine",
  "cable",
  "kettlebell",
  "bodyweight",
  "bench",
  "resistance_band",
  "cardio",
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function OnboardingWizard({
  goals,
  name,
}: {
  goals: FitnessGoal[];
  name: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [goalId, setGoalId] = useState<string | null>(null);
  const [age, setAge] = useState<string>("");
  const [experience, setExperience] = useState<
    "beginner" | "intermediate" | "advanced"
  >("beginner");
  const [weeklyFrequency, setWeeklyFrequency] = useState(3);
  const [sessionMinutes, setSessionMinutes] = useState(45);
  const [equipment, setEquipment] = useState<string[]>(["dumbbell", "bodyweight"]);
  const [considerations, setConsiderations] = useState("");
  const [trainingDays, setTrainingDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [medicationTracking, setMedicationTracking] = useState(false);

  // Grouped into 5 quick screens instead of 10 one-question steps.
  const totalSteps = 5;

  function toggle(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  async function finish() {
    if (!goalId) {
      setError("Please choose a goal.");
      setStep(0);
      return;
    }
    setSaving(true);
    setError(null);
    const res = await completeOnboarding({
      goalId,
      age: age ? Number(age) : undefined,
      experience,
      weeklyFrequency,
      sessionMinutes,
      equipment,
      considerations,
      trainingDays,
      medicationTracking,
    });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError(res.error ?? "Could not save. Please try again.");
      setSaving(false);
    }
  }

  // Goal is the only required step; everything else has a sensible default.
  const canNext = step !== 0 || Boolean(goalId);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-8 sm:px-6">
      {/* Progress */}
      <div className="mb-6 flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= step ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-elevated)]"
            )}
          />
        ))}
      </div>

      <div className="flex-1">
        {step === 0 && (
          <StepGoal
            name={name}
            goals={goals}
            selected={goalId}
            onSelect={setGoalId}
          />
        )}

        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold">A bit about you</h2>
              <p className="mt-1 text-[var(--text-secondary)]">
                This tailors intensity, recovery and progression. All optional.
              </p>
            </div>
            <Field label="How old are you?">
              <div className="relative max-w-xs">
                <input
                  type="number"
                  inputMode="numeric"
                  min={13}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 32"
                  className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 pr-16 text-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
                  years
                </span>
              </div>
            </Field>
            <Field label="Your training experience">
              <Choices
                columns={3}
                options={[
                  { value: "beginner", label: "Beginner", hint: "New / returning" },
                  { value: "intermediate", label: "Intermediate", hint: "6+ months" },
                  { value: "advanced", label: "Advanced", hint: "Years in" },
                ]}
                value={experience}
                onChange={(v) => setExperience(v as typeof experience)}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold">Your training week</h2>
              <p className="mt-1 text-[var(--text-secondary)]">
                We&apos;ll shape your plan around this.
              </p>
            </div>
            <Field label="Days per week">
              <Choices
                columns={5}
                options={[2, 3, 4, 5, 6].map((n) => ({
                  value: String(n),
                  label: `${n}`,
                }))}
                value={String(weeklyFrequency)}
                onChange={(v) => setWeeklyFrequency(Number(v))}
              />
            </Field>
            <Field label="Time per session">
              <Choices
                columns={4}
                options={[30, 45, 60, 75].map((n) => ({
                  value: String(n),
                  label: `${n} min`,
                }))}
                value={String(sessionMinutes)}
                onChange={(v) => setSessionMinutes(Number(v))}
              />
            </Field>
            <Field label="Which days? (optional)">
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {DAYS.map((d) => {
                  const active = trainingDays.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => toggle(trainingDays, d, setTrainingDays)}
                      className={cn(
                        "rounded-xl border py-3 text-sm font-medium transition-colors",
                        active
                          ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                          : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold">Equipment &amp; anything to work around</h2>
              <p className="mt-1 text-[var(--text-secondary)]">
                We&apos;ll pick exercises that fit — and respect any sore spots.
              </p>
            </div>
            <Field label="What can you access?">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {EQUIPMENT.map((e) => {
                  const active = equipment.includes(e);
                  return (
                    <button
                      key={e}
                      onClick={() => toggle(equipment, e, setEquipment)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-3 text-left text-sm capitalize transition-colors",
                        active
                          ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
                          : "border-[var(--border-subtle)] bg-[var(--surface-primary)]"
                      )}
                    >
                      <span className="font-medium">{e.replace("_", " ")}</span>
                      {active && (
                        <Check className="h-4 w-4 text-[var(--accent-primary)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Injuries or areas to consider (optional)">
              <textarea
                value={considerations}
                onChange={(e) => setConsiderations(e.target.value)}
                rows={3}
                placeholder="e.g. Sore left knee — avoid deep lunges and high-impact jumps."
                className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
              />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold">Enable health &amp; symptom tracking?</h2>
            <p className="mt-1 text-[var(--text-secondary)]">
              Track the symptoms, vitals and medications that matter to you. You
              can change this any time in Settings.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { value: true, label: "Yes, enable it", hint: "Adds the Health tab" },
                { value: false, label: "Not now", hint: "Keep it simple" },
              ].map((o) => (
                <button
                  key={String(o.value)}
                  onClick={() => setMedicationTracking(o.value)}
                  className={cn(
                    "rounded-2xl border p-5 text-left transition-colors",
                    medicationTracking === o.value
                      ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
                      : "border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:border-[var(--text-muted)]"
                  )}
                >
                  <p className="font-semibold">{o.label}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{o.hint}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || saving}
        >
          Back
        </Button>
        {step < totalSteps - 1 ? (
          <Button
            onClick={() => {
              if (step === 0 && !goalId) {
                setError("Please choose a goal to continue.");
                return;
              }
              setError(null);
              setStep((s) => s + 1);
            }}
            disabled={!canNext}
          >
            Continue
          </Button>
        ) : (
          <Button onClick={finish} disabled={saving}>
            {saving ? "Saving…" : "Finish setup"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[var(--text-secondary)]">{label}</p>
      {children}
    </div>
  );
}

function Choices({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { value: string; label: string; hint?: string }[];
  value: string;
  onChange: (v: string) => void;
  columns?: number;
}) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-xl border p-3 text-center transition-colors",
            value === o.value
              ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
              : "border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:border-[var(--text-muted)]"
          )}
        >
          <p className="text-sm font-semibold capitalize">{o.label}</p>
          {o.hint && (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{o.hint}</p>
          )}
        </button>
      ))}
    </div>
  );
}

function StepGoal({
  name,
  goals,
  selected,
  onSelect,
}: {
  name: string;
  goals: FitnessGoal[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold sm:text-3xl">
        Welcome{name ? `, ${name.split(" ")[0]}` : ""}. What&apos;s your primary
        goal?
      </h2>
      <p className="mt-1 text-[var(--text-secondary)]">
        We&apos;ll tailor recommendations to it — you can change this later.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {goals.map((g) => {
          const active = selected === g.id;
          return (
            <button
              key={g.id}
              onClick={() => onSelect(g.id)}
              className={cn(
                "group relative h-40 overflow-hidden rounded-[var(--radius-card)] border text-left transition-transform active:scale-[0.99]",
                active
                  ? "border-[var(--border-active)]"
                  : "border-[var(--border-subtle)]"
              )}
            >
              <CoverImage
                path={g.cover_image_path}
                alt={g.name}
                sizes="(max-width: 640px) 100vw, 50vw"
                className="transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              {active && (
                <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-primary)] text-black">
                  <Check className="h-4 w-4" />
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-lg font-bold">{g.name}</p>
                <p className="line-clamp-1 text-xs text-[var(--text-secondary)]">
                  {g.short_description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
