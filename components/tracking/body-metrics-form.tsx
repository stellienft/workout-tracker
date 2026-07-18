"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { saveBodyMetrics } from "@/lib/actions/tracking";

const FIELDS: { key: string; label: string }[] = [
  { key: "weightKg", label: "Weight (kg)" },
  { key: "waistCm", label: "Waist (cm)" },
  { key: "chestCm", label: "Chest (cm)" },
  { key: "hipsCm", label: "Hips (cm)" },
  { key: "leftArmCm", label: "Left arm (cm)" },
  { key: "rightArmCm", label: "Right arm (cm)" },
  { key: "leftThighCm", label: "Left thigh (cm)" },
  { key: "rightThighCm", label: "Right thigh (cm)" },
];

export function BodyMetricsForm() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>({});

  function submit() {
    const payload: Record<string, unknown> = {};
    for (const f of FIELDS) if (values[f.key]) payload[f.key] = values[f.key];
    if (Object.keys(payload).length === 0) {
      toast("Enter at least one measurement.", "error");
      return;
    }
    startTransition(async () => {
      const res = await saveBodyMetrics(payload);
      if (res.ok) {
        toast("Metrics saved for today.", "success");
        setValues({});
        router.refresh();
      } else {
        toast(res.error ?? "Could not save", "error");
      }
    });
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-secondary)]">{f.label}</span>
            <input
              inputMode="decimal"
              value={values[f.key] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.key]: e.target.value }))
              }
              className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
            />
          </label>
        ))}
      </div>
      <Button onClick={submit} disabled={pending} className="mt-4">
        {pending ? "Saving…" : "Save today's metrics"}
      </Button>
    </div>
  );
}
