"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { saveMedicationLog } from "@/lib/actions/tracking";
import { GLP1_SITES, nextInjectionSite, siteRecentlyUsed } from "@/lib/glp1";

const SITES = GLP1_SITES;
const EFFECTS = ["Nausea", "Fatigue", "Headache", "Reduced appetite", "Constipation", "Injection site reaction"];

export function MedicationForm({ recentSites = [] }: { recentSites?: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("Mounjaro");
  const [dose, setDose] = useState("");
  const [site, setSite] = useState("");
  const [effects, setEffects] = useState<string[]>([]);
  const [severity, setSeverity] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Rotation guidance: suggest the least-recently-used site and warn on reuse.
  const suggestedSite = recentSites.length > 0 ? nextInjectionSite(recentSites) : null;
  const reuseWarning = site !== "" && siteRecentlyUsed(site, recentSites);

  function toggleEffect(e: string) {
    setEffects((list) =>
      list.includes(e) ? list.filter((x) => x !== e) : [...list, e]
    );
  }

  function submit() {
    startTransition(async () => {
      const res = await saveMedicationLog({
        medicationName: name,
        doseMg: dose || null,
        injectionSite: site || undefined,
        sideEffects: effects,
        sideEffectSeverity: severity || null,
        notes,
      });
      if (res.ok) {
        toast("Dose logged.", "success");
        setDose("");
        setEffects([]);
        setSeverity("");
        setNotes("");
        router.refresh();
      } else {
        toast(res.error ?? "Could not save", "error");
      }
    });
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-secondary)]">Medication</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-secondary)]">Dose (mg)</span>
          <input
            inputMode="decimal"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="e.g. 5"
            className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[var(--text-secondary)]">Injection site</span>
          {suggestedSite && (
            <button
              type="button"
              onClick={() => setSite(suggestedSite)}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-muted)] px-2.5 py-1 text-xs font-medium text-[var(--accent-primary)]"
            >
              <Sparkles className="h-3 w-3" /> Rotate to {suggestedSite}
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {SITES.map((s) => {
            const isSuggested = s === suggestedSite && site !== s;
            return (
              <button
                key={s}
                onClick={() => setSite(site === s ? "" : s)}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  site === s
                    ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                    : isSuggested
                      ? "border-[var(--accent-primary)]/60 text-[var(--text-primary)]"
                      : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                {s}
                {isSuggested && " ✦"}
              </button>
            );
          })}
        </div>
        {reuseWarning && (
          <p className="mt-2 text-xs text-[var(--warning)]">
            You used this site in your last {recentSites.indexOf(site) === 0 ? "dose" : "couple of doses"} — rotating sites helps avoid irritation and lumps.
          </p>
        )}
      </div>

      <div>
        <span className="text-xs text-[var(--text-secondary)]">Side effects</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {EFFECTS.map((e) => (
            <button
              key={e}
              onClick={() => toggleEffect(e)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                effects.includes(e)
                  ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                  : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        {effects.length > 0 && (
          <label className="mt-3 flex flex-col gap-1">
            <span className="text-xs text-[var(--text-secondary)]">
              Overall severity (0–5)
            </span>
            <input
              inputMode="numeric"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="h-11 w-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
            />
          </label>
        )}
      </div>

      <label className="block">
        <span className="text-xs text-[var(--text-secondary)]">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>

      <Button onClick={submit} disabled={pending} className="w-full">
        {pending ? "Saving…" : "Log dose"}
      </Button>
    </div>
  );
}
