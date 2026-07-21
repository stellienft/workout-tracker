"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronDown, Wand2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { SPLIT_TEMPLATES } from "@/lib/split-templates";
import { createSplitFromTemplate } from "@/lib/actions/splits";

export function SplitTemplates() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  function use(key: string) {
    setBusyKey(key);
    startTransition(async () => {
      const res = await createSplitFromTemplate(key);
      if (res.ok) {
        toast("Split added — customise it any time.", "success");
        router.push(`/splits/${res.id}`);
      } else {
        toast(res.error ?? "Could not add", "error");
        setBusyKey(null);
      }
    });
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
        <h2 className="text-sm font-semibold">Start from a ready-made split</h2>
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        New to this? Pick one below — it&apos;s added to your splits fully filled
        in, and you can tweak anything or start training right away.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SPLIT_TEMPLATES.map((t) => {
          const open = openKey === t.key;
          return (
            <div
              key={t.key}
              className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]"
            >
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{t.name}</p>
                  <span className="rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-primary)]">
                    {t.level}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t.days.length} days · {t.daysPerWeek}
                </p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  {t.summary}
                </p>

                <button
                  onClick={() => setOpenKey(open ? null : t.key)}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {open ? "Hide" : "Preview days"}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>

                {open && (
                  <ul className="mt-2 space-y-1.5 border-t border-[var(--border-subtle)] pt-2">
                    {t.days.map((d, i) => (
                      <li key={i} className="text-xs">
                        <span className="font-medium">{d.name}</span>
                        <span className="text-[var(--text-muted)]">
                          {" "}
                          — {d.exercises.length} exercises
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => use(t.key)}
                  disabled={pending}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] py-2.5 text-sm font-semibold text-black disabled:opacity-60"
                >
                  <Wand2 className="h-4 w-4" />
                  {busyKey === t.key ? "Adding…" : "Use this split"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
