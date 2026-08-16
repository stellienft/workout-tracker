"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { deleteMedicationLog } from "@/lib/actions/tracking";
import { MedicationForm } from "@/components/tracking/medication-form";

export interface MedLogRow {
  id: string;
  medication_name: string;
  dose_mg: number | null;
  taken_on: string;
  injection_site: string | null;
  side_effects: string[] | null;
  side_effect_severity: number | null;
  notes: string | null;
}

/** Australian date format (DD/MM/YYYY). Anchor at noon to avoid tz slippage. */
function auDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-AU");
}

export function MedicationHistory({
  logs,
  recentSites,
}: {
  logs: MedLogRow[];
  recentSites?: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(logs);
  const [editId, setEditId] = useState<string | null>(null);

  function remove(id: string) {
    if (!confirm("Delete this injection log? This can't be undone.")) return;
    setRows((r) => r.filter((x) => x.id !== id));
    startTransition(async () => {
      const res = await deleteMedicationLog(id);
      if (res.ok) toast("Deleted.", "success");
      else {
        toast(res.error ?? "Could not delete", "error");
        router.refresh();
      }
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="font-semibold">History</h3>
      <div className="mt-3 divide-y divide-[var(--border-subtle)] rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
        {rows.map((l) =>
          editId === l.id ? (
            <div key={l.id} className="p-3">
              <MedicationForm
                recentSites={recentSites}
                editing={{
                  id: l.id,
                  medicationName: l.medication_name,
                  doseMg: l.dose_mg,
                  takenOn: l.taken_on,
                  injectionSite: l.injection_site,
                  sideEffects: l.side_effects ?? [],
                  sideEffectSeverity: l.side_effect_severity,
                  notes: l.notes,
                }}
                onDone={() => {
                  setEditId(null);
                  router.refresh();
                }}
              />
            </div>
          ) : (
            <div key={l.id} className="p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">
                  {l.medication_name}
                  {l.dose_mg ? ` · ${l.dose_mg} mg` : ""}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-[var(--text-muted)]">{auDate(l.taken_on)}</span>
                  <button
                    onClick={() => setEditId(l.id)}
                    aria-label="Edit injection"
                    className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(l.id)}
                    disabled={pending}
                    aria-label="Delete injection"
                    className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {l.injection_site && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">Site: {l.injection_site}</p>
              )}
              {l.side_effects && l.side_effects.length > 0 && (
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Side effects: {l.side_effects.join(", ")}
                  {l.side_effect_severity != null
                    ? ` (severity ${l.side_effect_severity}/5)`
                    : ""}
                </p>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
