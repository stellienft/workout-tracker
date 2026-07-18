"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateSettings } from "@/lib/actions/tracking";

export function SettingsForm({
  initial,
}: {
  initial: {
    fullName: string;
    unitPreference: "metric" | "imperial";
    hapticsEnabled: boolean;
    medicationTracking: boolean;
    considerations: string;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(initial.fullName);
  const [unit, setUnit] = useState(initial.unitPreference);
  const [haptics, setHaptics] = useState(initial.hapticsEnabled);
  const [medication, setMedication] = useState(initial.medicationTracking);
  const [considerations, setConsiderations] = useState(initial.considerations);

  function save() {
    startTransition(async () => {
      const res = await updateSettings({
        fullName,
        unitPreference: unit,
        hapticsEnabled: haptics,
        medicationTracking: medication,
        considerations,
      });
      if (res.ok) {
        toast("Settings saved.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Could not save", "error");
      }
    });
  }

  return (
    <div className="space-y-5 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Full name</span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>

      <div>
        <span className="text-sm font-medium">Units</span>
        <div className="mt-2 flex gap-2">
          {(["metric", "imperial"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`flex-1 rounded-xl border py-2.5 text-sm capitalize ${
                unit === u
                  ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                  : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <Toggle
        label="Haptic feedback"
        hint="Vibrate on set completion and rest-timer end (supported devices)."
        checked={haptics}
        onChange={setHaptics}
      />
      <Toggle
        label="Medication & wellbeing tracking"
        hint="Show the Medication tab for tracking Mounjaro."
        checked={medication}
        onChange={setMedication}
      />

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Movement considerations</span>
        <textarea
          value={considerations}
          onChange={(e) => setConsiderations(e.target.value)}
          rows={3}
          placeholder="e.g. Sore left shoulder — avoid overhead pressing."
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>

      <Button onClick={save} disabled={pending} size="lg" className="w-full">
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-elevated)]"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-black transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
