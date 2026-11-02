"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteMetabolicEntry } from "@/lib/actions/metabolic";
import type { MetabolicEntry } from "@/lib/metabolic";

function fmtDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function parts(e: MetabolicEntry): string {
  const bits: string[] = [];
  if (e.fasting_glucose_mmol != null) bits.push(`Glu ${e.fasting_glucose_mmol}`);
  if (e.fasting_insulin_uu != null) bits.push(`Ins ${e.fasting_insulin_uu}`);
  if (e.hba1c_pct != null) bits.push(`HbA1c ${e.hba1c_pct}%`);
  if (e.triglycerides_mmol != null) bits.push(`TG ${e.triglycerides_mmol}`);
  if (e.hdl_mmol != null) bits.push(`HDL ${e.hdl_mmol}`);
  if (e.waist_cm != null) bits.push(`Waist ${e.waist_cm}cm`);
  return bits.join(" · ") || "—";
}

export function EntryList({ entries }: { entries: MetabolicEntry[] }) {
  const router = useRouter();
  const [list, setList] = useState(entries);
  const [, startTransition] = useTransition();

  function remove(id: string) {
    setList((l) => l.filter((e) => e.id !== id));
    startTransition(async () => {
      await deleteMetabolicEntry(id);
      router.refresh();
    });
  }

  if (list.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">History</h2>
      <div className="mt-3 divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
        {list.map((e) => (
          <div key={e.id} className="flex items-center gap-3 px-4 py-3">
            <div className="w-16 shrink-0 text-xs font-medium text-[var(--text-muted)]">
              {fmtDate(e.recorded_on)}
            </div>
            <div className="min-w-0 flex-1 text-sm text-[var(--text-secondary)]">
              {parts(e)}
            </div>
            <button
              onClick={() => remove(e.id)}
              aria-label="Delete entry"
              className="-m-1 shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--warning)]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
