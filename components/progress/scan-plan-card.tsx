"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Dumbbell, HeartPulse, Utensils, AlertTriangle, Lock } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { generateScanPlan, type ScanPlan } from "@/lib/actions/body-composition";

export function ScanPlanCard({
  scanId,
  initialPlan,
  generatedAt,
  isPro,
}: {
  scanId: string;
  initialPlan: ScanPlan | null;
  generatedAt: string | null;
  isPro: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [plan, setPlan] = useState<ScanPlan | null>(initialPlan);

  function generate() {
    startTransition(async () => {
      const res = await generateScanPlan(scanId);
      if (res.ok) {
        setPlan(res.plan);
        toast("Training focus ready.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't generate a plan", "error");
      }
    });
  }

  if (!plan) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-active)] bg-[var(--accent-muted)] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--accent-ink)]">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Turn this scan into a plan</p>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              Let the AI coach read your scan — imbalances, body fat, lean mass — and
              build a training focus around it.
            </p>
            <button
              onClick={generate}
              disabled={pending || !isPro}
              className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
            >
              {!isPro && <Lock className="h-4 w-4" />}
              {pending ? "Reading your scan…" : isPro ? "Generate training focus" : "Pro feature"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
            <Sparkles className="h-3.5 w-3.5" /> Training focus
          </p>
          <h3 className="mt-1 text-lg font-bold leading-tight">{plan.headline}</h3>
        </div>
        <button
          onClick={generate}
          disabled={pending || !isPro}
          className="shrink-0 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-60"
        >
          {pending ? "…" : "Regenerate"}
        </button>
      </div>

      {plan.summary && (
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{plan.summary}</p>
      )}

      {plan.flags.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {plan.flags.map((f, i) => (
            <p
              key={i}
              className="flex items-start gap-2 rounded-lg bg-[var(--warning)]/10 px-3 py-2 text-xs text-[var(--warning)]"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{f}</span>
            </p>
          ))}
        </div>
      )}

      {plan.priorities.length > 0 && (
        <ol className="mt-4 space-y-2.5">
          {plan.priorities.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-xs font-bold text-[var(--accent-primary)]">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{p.title}</p>
                {p.detail && (
                  <p className="text-xs text-[var(--text-muted)]">{p.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
        {plan.split && (
          <PlanBox icon={<Dumbbell className="h-4 w-4" />} label="Training" text={plan.split} />
        )}
        {plan.cardio && (
          <PlanBox icon={<HeartPulse className="h-4 w-4" />} label="Cardio" text={plan.cardio} />
        )}
        {plan.nutrition && (
          <PlanBox icon={<Utensils className="h-4 w-4" />} label="Nutrition" text={plan.nutrition} />
        )}
      </div>

      {generatedAt && (
        <p className="mt-3 text-[11px] text-[var(--text-muted)]">
          Generated {new Date(generatedAt).toLocaleDateString("en-AU")} · a guide, not medical advice.
        </p>
      )}
    </div>
  );
}

function PlanBox({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {icon} {label}
      </p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{text}</p>
    </div>
  );
}
