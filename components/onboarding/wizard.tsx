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
  const [experience, setExperience] = useState<
    "beginner" | "intermediate" | "advanced"
  >("beginner");
  const [weeklyFrequency, setWeeklyFrequency] = useState(3);
  const [sessionMinutes, setSessionMinutes] = useState(45);
  const [equipment, setEquipment] = useState<string[]>(["dumbbell", "bodyweight"]);
  const [considerations, setConsiderations] = useState("");
  const [trainingDays, setTrainingDays] = useState<string[]>([
    "Mon",
    "Wed",
    "Fri",
  ]);
  const [medicationTracking, setMedicationTracking] = useState(false);

  const totalSteps = 8;

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

  const canNext =
    (step === 0 && goalId) ||
    (step === 5 ? true : true) ||
    step !== 0;

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
          <StepChoice
            title="What's your training experience?"
            options={[
              { value: "beginner", label: "Beginner", hint: "New or returning" },
              {
                value: "intermediate",
                label: "Intermediate",
                hint: "6+ months consistent",
              },
              { value: "advanced", label: "Advanced", hint: "Years of training" },
            ]}
            value={experience}
            onChange={(v) => setExperience(v as typeof experience)}
          />
        )}
        {step === 2 && (
          <StepChoice
            title="How many days per week can you train?"
            options={[2, 3, 4, 5, 6].map((n) => ({
              value: String(n),
              label: `${n} days`,
              hint: n <= 3 ? "Great for consistency" : "Higher volume",
            }))}
            value={String(weeklyFrequency)}
            onChange={(v) => setWeeklyFrequency(Number(v))}
          />
        )}
        {step === 3 && (
          <StepChoice
            title="How long can you train per session?"
            options={[30, 45, 60, 75].map((n) => ({
              value: String(n),
              label: `${n} min`,
            }))}
            value={String(sessionMinutes)}
            onChange={(v) => setSessionMinutes(Number(v))}
          />
        )}
        {step === 4 && (
          <StepMulti
            title="What equipment can you access?"
            subtitle="Pick everything that applies."
            options={EQUIPMENT.map((e) => ({
              value: e,
              label: e.replace("_", " "),
            }))}
            selected={equipment}
            onToggle={(v) => toggle(equipment, v, setEquipment)}
          />
        )}
        {step === 5 && (
          <div>
            <h2 className="text-2xl font-bold">
              Any movements or areas to consider?
            </h2>
            <p className="mt-1 text-[var(--text-secondary)]">
              For example a sore left shoulder. We&apos;ll adapt your program and
              suggest safe substitutes.
            </p>
            <textarea
              value={considerations}
              onChange={(e) => setConsiderations(e.target.value)}
              rows={4}
              placeholder="e.g. Sore left shoulder — avoid overhead pressing."
              className="mt-4 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 text-white placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
            />
          </div>
        )}
        {step === 6 && (
          <StepMulti
            title="Which days do you usually train?"
            options={DAYS.map((d) => ({ value: d, label: d }))}
            selected={trainingDays}
            onToggle={(v) => toggle(trainingDays, v, setTrainingDays)}
            columns={4}
          />
        )}
        {step === 7 && (
          <div>
            <h2 className="text-2xl font-bold">
              Enable medication &amp; wellbeing tracking?
            </h2>
            <p className="mt-1 text-[var(--text-secondary)]">
              Track Mounjaro doses, side effects and recovery alongside your
              training. You can change this any time in Settings.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { value: true, label: "Yes, enable it", hint: "Adds the Medication tab" },
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
        We&apos;ll tailor program recommendations to it. You can change this
        later.
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

function StepChoice({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { value: string; label: string; hint?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-2xl border p-5 text-left transition-colors",
              value === o.value
                ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:border-[var(--text-muted)]"
            )}
          >
            <p className="font-semibold capitalize">{o.label}</p>
            {o.hint && (
              <p className="text-sm text-[var(--text-secondary)]">{o.hint}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepMulti({
  title,
  subtitle,
  options,
  selected,
  onToggle,
  columns = 2,
}: {
  title: string;
  subtitle?: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  columns?: number;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-[var(--text-secondary)]">{subtitle}</p>
      )}
      <div
        className="mt-6 grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
      >
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              onClick={() => onToggle(o.value)}
              className={cn(
                "flex items-center justify-between rounded-2xl border p-4 text-left capitalize transition-colors",
                active
                  ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
                  : "border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:border-[var(--text-muted)]"
              )}
            >
              <span className="font-medium">{o.label}</span>
              {active && (
                <Check className="h-4 w-4 text-[var(--accent-primary)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
