"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check } from "lucide-react";
import { addMetabolicEntry } from "@/lib/actions/metabolic";
import { isoDate } from "@/lib/utils";

const FIELDS = [
  { key: "fastingGlucose", label: "Fasting glucose", unit: "mmol/L", step: "0.1" },
  { key: "fastingInsulin", label: "Fasting insulin", unit: "µU/mL", step: "0.1" },
  { key: "hba1c", label: "HbA1c", unit: "%", step: "0.1" },
  { key: "triglycerides", label: "Triglycerides", unit: "mmol/L", step: "0.1" },
  { key: "hdl", label: "HDL", unit: "mmol/L", step: "0.1" },
  { key: "waist", label: "Waist", unit: "cm", step: "0.5" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export function MarkerForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recordedOn, setRecordedOn] = useState(isoDate(new Date()));
  const [vals, setVals] = useState<Record<FieldKey, string>>({
    fastingGlucose: "",
    fastingInsulin: "",
    hba1c: "",
    triglycerides: "",
    hdl: "",
    waist: "",
  });
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await addMetabolicEntry({ recordedOn, ...vals, notes });
      if (!res.ok) {
        setError(res.error ?? "Couldn't save");
        return;
      }
      setVals({
        fastingGlucose: "",
        fastingInsulin: "",
        hba1c: "",
        triglycerides: "",
        hdl: "",
        waist: "",
      });
      setNotes("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border-subtle)] py-3.5 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
      >
        <Plus className="h-4 w-4" /> Add lab results
      </button>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Add lab results</h3>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          Date
          <input
            type="date"
            value={recordedOn}
            max={isoDate(new Date())}
            onChange={(e) => setRecordedOn(e.target.value)}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]"
          />
        </label>
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Enter whatever you have from your blood test — any field can be left blank.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {f.label} <span className="text-[var(--text-muted)]">({f.unit})</span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              step={f.step}
              value={vals[f.key]}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder="—"
              className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
            />
          </label>
        ))}
      </div>

      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="mt-3 h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
      />

      {error && <p className="mt-2 text-xs text-[var(--warning)]">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] py-3 font-bold text-[var(--accent-ink)] disabled:opacity-60"
        >
          <Check className="h-5 w-5" /> {pending ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-2xl border border-[var(--border-subtle)] px-5 py-3 text-sm font-medium text-[var(--text-secondary)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
