"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Footprints, Save, Activity } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { saveWalkingPadSession } from "@/lib/actions/activities";

/** Log a walk — steps, distance, time and calories — saved to Activities. */
export function WalkingClient() {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState("");
  const [km, setKm] = useState("");
  const [mins, setMins] = useState("");
  const [kcal, setKcal] = useState("");

  function save() {
    const s = Number(steps) || 0;
    const distanceM = Math.round((Number(km) || 0) * 1000);
    if (s <= 0 && distanceM <= 0) {
      toast("Enter your steps or distance.", "error");
      return;
    }
    setSaving(true);
    saveWalkingPadSession({
      steps: s,
      distanceM,
      movingSeconds: Math.round((Number(mins) || 0) * 60),
      calories: Math.round(Number(kcal) || 0),
    }).then((res) => {
      setSaving(false);
      if (res.ok) {
        toast("Walk saved to your activities.", "success");
        setSteps("");
        setKm("");
        setMins("");
        setKcal("");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't save", "error");
      }
    });
  }

  const fields: [string, string, string, (v: string) => void, string][] = [
    ["Steps", steps, "e.g. 3200", setSteps, ""],
    ["Distance", km, "e.g. 2.4", setKm, "km"],
    ["Time", mins, "e.g. 30", setMins, "min"],
    ["Calories", kcal, "e.g. 120", setKcal, "kcal"],
  ];

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          <Footprints className="h-3.5 w-3.5" /> Log a walk
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Been for a walk or used a walking pad? Pop your numbers in below — from your pad&apos;s
          display, phone or watch.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {fields.map(([label, val, ph, setter, unit]) => (
            <label key={label} className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              {label}
              <span className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={ph}
                  className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--border-active)] focus:outline-none"
                />
                {unit ? (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                    {unit}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save walk"}
        </button>
      </div>

      <Link
        href="/activities"
        className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 text-sm transition-colors hover:border-[var(--border-active)]"
      >
        <Activity className="h-5 w-5 shrink-0 text-[var(--accent-primary)]" />
        <span className="flex-1 font-medium">See all your walks &amp; activities</span>
        <span className="text-[var(--accent-primary)]">Open →</span>
      </Link>
    </div>
  );
}
