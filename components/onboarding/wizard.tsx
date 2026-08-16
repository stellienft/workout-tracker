"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/ui/cover-image";
import { cn } from "@/lib/utils";
import {
  completeOnboarding,
  recommendProgramsForOnboarding,
  type RecommendedProgram,
} from "@/lib/actions/onboarding";
import { enrolInProgram } from "@/lib/actions/enrolment";
import { processReferral } from "@/lib/actions/referrals";
import { INJURY_AREAS } from "@/lib/injury";
import type { FitnessGoal } from "@/lib/types";
import { Check, CalendarDays, Clock, Dumbbell, Home, Building2 } from "lucide-react";

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
  const [trainingLocation, setTrainingLocation] = useState<"home" | "gym" | "both">("gym");
  const [weeklyFrequency, setWeeklyFrequency] = useState(3);
  const [sessionMinutes, setSessionMinutes] = useState(45);
  const [equipment, setEquipment] = useState<string[]>(["dumbbell", "bodyweight"]);
  const [injuryAreas, setInjuryAreas] = useState<string[]>([]);
  const [considerations, setConsiderations] = useState("");
  const [trainingDays, setTrainingDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [medicationTracking, setMedicationTracking] = useState(false);
  const [glp1, setGlp1] = useState<boolean | null>(null);

  // Program recommendations (final step).
  const [recs, setRecs] = useState<RecommendedProgram[] | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [chosenProgramId, setChosenProgramId] = useState<string | null>(null);

  // Grouped quick screens. Step 5 (body-scan) is optional; step 6 recommends
  // programs matched to the member's goal, level and where they train.
  const totalSteps = 7;
  const RECS_STEP = 6;

  // Fetch recommendations when the member reaches the final step.
  useEffect(() => {
    if (step !== RECS_STEP || recs !== null || !goalId) return;
    setLoadingRecs(true);
    recommendProgramsForOnboarding({
      goalId,
      experience,
      location: trainingLocation,
      glp1: glp1 === true,
    })
      .then((r) => setRecs(r))
      .catch(() => setRecs([]))
      .finally(() => setLoadingRecs(false));
  }, [step, recs, goalId, experience, trainingLocation, glp1]);

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
      trainingLocation,
      weeklyFrequency,
      sessionMinutes,
      equipment,
      injuryAreas,
      considerations,
      trainingDays,
      medicationTracking: medicationTracking || glp1 === true,
      glp1: glp1 === true,
    });
    if (res.ok) {
      // Redeem any referral invite (grants both sides a free month).
      await processReferral().catch(() => {});
      // Start the program they picked from the recommendations, if any.
      let enrolled = false;
      if (chosenProgramId) {
        const e = await enrolInProgram({
          programId: chosenProgramId,
          daysPerWeek: weeklyFrequency,
        }).catch(() => ({ ok: false }));
        enrolled = !!e.ok;
      }
      // If they started a program, take them to it; otherwise the membership offer.
      router.push(enrolled ? "/dashboard" : "/billing?welcome=1");
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
            <Field label="Your fitness level">
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
            <Field label="Where do you train?">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "home", label: "Home", icon: <Home className="h-4 w-4" /> },
                  { value: "gym", label: "Gym", icon: <Building2 className="h-4 w-4" /> },
                  { value: "both", label: "Both", icon: <Dumbbell className="h-4 w-4" /> },
                ].map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setTrainingLocation(o.value as typeof trainingLocation)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-semibold transition-colors",
                      trainingLocation === o.value
                        ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                        : "border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)]"
                    )}
                  >
                    {o.icon}
                    {o.label}
                  </button>
                ))}
              </div>
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
            <Field label="Any areas currently sore or injured? (optional)">
              <p className="-mt-1 mb-2 text-xs text-[var(--text-muted)]">
                We&apos;ll flag exercises that load these areas and suggest safer
                swaps.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {INJURY_AREAS.map((a) => {
                  const active = injuryAreas.includes(a.value);
                  return (
                    <button
                      key={a.value}
                      onClick={() => toggle(injuryAreas, a.value, setInjuryAreas)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-3 text-left text-sm transition-colors",
                        active
                          ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
                          : "border-[var(--border-subtle)] bg-[var(--surface-primary)]"
                      )}
                    >
                      <span className="font-medium">{a.label}</span>
                      {active && <Check className="h-4 w-4 text-[var(--accent-primary)]" />}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Anything else to note? (optional)">
              <textarea
                value={considerations}
                onChange={(e) => setConsiderations(e.target.value)}
                rows={2}
                placeholder="e.g. Recovering from surgery — keep impact low."
                className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
              />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8">
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

            <div>
              <h2 className="text-2xl font-bold">
                Are you using a GLP-1 medication?
              </h2>
              <p className="mt-1 text-[var(--text-secondary)]">
                Mounjaro, Ozempic, Wegovy, Zepbound and similar. Stellio is built
                to help you <span className="text-[var(--text-primary)]">keep your muscle while you lose weight</span> —
                with tailored programs, a protein target, and dose &amp; side-effect
                tracking. Totally optional and private.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { value: true, label: "Yes, I am", hint: "Unlocks the GLP-1 companion & programs" },
                  { value: false, label: "No / prefer not to say", hint: "" },
                ].map((o) => (
                  <button
                    key={String(o.value)}
                    onClick={() => {
                      setGlp1(o.value);
                      if (o.value) setMedicationTracking(true);
                    }}
                    className={cn(
                      "rounded-2xl border p-5 text-left transition-colors",
                      glp1 === o.value
                        ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
                        : "border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:border-[var(--text-muted)]"
                    )}
                  >
                    <p className="font-semibold">{o.label}</p>
                    {o.hint && (
                      <p className="text-sm text-[var(--text-secondary)]">{o.hint}</p>
                    )}
                  </button>
                ))}
              </div>
              {glp1 === true && (
                <div className="mt-4 rounded-2xl border border-[var(--accent-primary)]/40 bg-[var(--accent-muted)] p-4 text-sm text-[var(--text-secondary)]">
                  Great — we&apos;ll recommend GLP-1 programs built for muscle
                  preservation, and your Health tab is ready for logging doses.
                </div>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">
                Upload a body composition scan?
              </h2>
              <p className="mt-1 text-[var(--text-secondary)]">
                If you&apos;ve had an InBody, DEXA, or Evolt scan, you can upload
                the results from the Progress page after subscribing to Pro.
                You can skip this for now.
              </p>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              This step is optional — you can always upload a scan later from
              the Progress page.
            </p>
          </div>
        )}

        {step === RECS_STEP && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold">Programs picked for you</h2>
              <p className="mt-1 text-[var(--text-secondary)]">
                Based on your goal, {experience} level and training{" "}
                {trainingLocation === "both" ? "at home & the gym" : `at ${trainingLocation === "home" ? "home" : "the gym"}`}.
                Tap one to start it now, or skip and browse later.
              </p>
            </div>

            {loadingRecs && (
              <p className="text-sm text-[var(--text-muted)]">Finding your best matches…</p>
            )}

            {!loadingRecs && recs && recs.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">
                We couldn&apos;t match a program to those answers — you can browse
                the full library from your dashboard.
              </p>
            )}

            <div className="grid gap-3">
              {(recs ?? []).map((p) => {
                const active = chosenProgramId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setChosenProgramId(active ? null : p.id)}
                    className={cn(
                      "flex items-stretch gap-3 overflow-hidden rounded-[var(--radius-card)] border text-left transition-transform active:scale-[0.99]",
                      active ? "border-[var(--border-active)]" : "border-[var(--border-subtle)]"
                    )}
                  >
                    <div className="relative h-auto w-28 shrink-0">
                      <CoverImage path={p.cover_image_path} alt={p.name} sizes="112px" />
                      {active && (
                        <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--accent-ink)]">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 p-3">
                      <p className="font-bold leading-tight">{p.name}</p>
                      {p.short_description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-secondary)]">
                          {p.short_description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {p.duration_weeks} wks
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Dumbbell className="h-3 w-3" />
                          {p.minimum_days_per_week}–{p.maximum_days_per_week}/wk
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {p.estimated_session_minutes} min
                        </span>
                        <span className="capitalize">{p.experience_level}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {chosenProgramId && (
              <p className="text-sm font-medium text-[var(--accent-primary)]">
                We&apos;ll start this program and take you straight to your dashboard.
              </p>
            )}
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
            {saving ? "Saving…" : chosenProgramId ? "Start program" : "Finish setup"}
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
                <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--accent-ink)]">
                  <Check className="h-4 w-4" />
                </span>
              )}
              <div className="on-media absolute inset-x-0 bottom-0 p-4">
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
