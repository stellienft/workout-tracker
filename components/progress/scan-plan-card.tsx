"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Dumbbell,
  HeartPulse,
  Utensils,
  AlertTriangle,
  Lock,
  ArrowRight,
  Check,
  Send,
  Printer,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  generateScanPlan,
  applyScanMacros,
  shareScanWithCoach,
  type ScanPlan,
} from "@/lib/actions/body-composition";

export interface RecoProgram {
  slug: string;
  name: string;
  experience_level: string;
}

export function ScanPlanCard({
  scanId,
  initialPlan,
  generatedAt,
  isPro,
  recommendedPrograms,
  hasCoach,
  printHref,
}: {
  scanId: string;
  initialPlan: ScanPlan | null;
  generatedAt: string | null;
  isPro: boolean;
  recommendedPrograms: RecoProgram[];
  hasCoach: boolean;
  printHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [plan, setPlan] = useState<ScanPlan | null>(initialPlan);
  const [macrosApplied, setMacrosApplied] = useState(false);
  const [shared, setShared] = useState(false);

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

  function applyMacros() {
    startTransition(async () => {
      const res = await applyScanMacros(scanId);
      if (res.ok) {
        setMacrosApplied(true);
        toast("Nutrition targets updated.", "success");
      } else {
        toast(res.error ?? "Couldn't apply macros", "error");
      }
    });
  }

  function share() {
    startTransition(async () => {
      const res = await shareScanWithCoach(scanId);
      if (res.ok) {
        setShared(true);
        toast("Sent to your coach.", "success");
      } else {
        toast(res.error ?? "Couldn't share", "error");
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
              build a training focus, macro targets and program picks around it.
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
        <p className="mt-2 max-w-[65ch] text-[15px] leading-relaxed text-[var(--text-secondary)]">
          {plan.summary}
        </p>
      )}

      {plan.flags.length > 0 && (
        <div className="mt-3 flex max-w-[65ch] flex-col gap-1.5">
          {plan.flags.map((f, i) => (
            <p
              key={i}
              className="flex items-start gap-2 rounded-lg bg-[var(--warning)]/10 px-3 py-2 text-[13px] text-[var(--warning)]"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{f}</span>
            </p>
          ))}
        </div>
      )}

      {plan.priorities.length > 0 && (
        <div className="mt-5 max-w-[65ch]">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Priorities
          </p>
          <ol className="space-y-3">
            {plan.priorities.map((p, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-xs font-bold text-[var(--accent-primary)]">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold leading-snug">{p.title}</p>
                  {p.detail && (
                    <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      {p.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(plan.split || plan.cardio || plan.nutrition) && (
        <div className="mt-5 max-w-[65ch] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
          {plan.split && <PlanRow icon={<Dumbbell className="h-4 w-4" />} label="Training" text={plan.split} />}
          {plan.cardio && <PlanRow icon={<HeartPulse className="h-4 w-4" />} label="Cardio" text={plan.cardio} />}
          {plan.nutrition && <PlanRow icon={<Utensils className="h-4 w-4" />} label="Nutrition" text={plan.nutrition} />}
        </div>
      )}

      {/* Suggested macros → one tap to nutrition targets */}
      {plan.macros && (
        <div className="mt-5 max-w-[65ch] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Suggested daily targets
            </p>
            <button
              onClick={applyMacros}
              disabled={pending || macrosApplied}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-3 py-1 text-xs font-semibold text-[var(--accent-ink)] disabled:opacity-60"
            >
              {macrosApplied ? <Check className="h-3.5 w-3.5" /> : null}
              {macrosApplied ? "Applied" : "Apply to nutrition"}
            </button>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            {[
              ["kcal", plan.macros.calories],
              ["P", plan.macros.protein_g],
              ["C", plan.macros.carbs_g],
              ["F", plan.macros.fat_g],
            ].map(([l, v]) => (
              <div key={l as string}>
                <p className="text-sm font-bold tabular-nums">{v as number}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{l as string}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended programs → one tap to start */}
      {recommendedPrograms.length > 0 && (
        <div className="mt-5 max-w-[65ch]">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Programs that fit this focus
          </p>
          <div className="flex flex-col gap-2">
            {recommendedPrograms.map((p) => (
              <Link
                key={p.slug}
                href={`/programs/${p.slug}`}
                className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 transition-colors hover:border-[var(--border-active)]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent-primary)]">
                  <Dumbbell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs capitalize text-[var(--text-muted)]">{p.experience_level}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
        {hasCoach && (
          <button
            onClick={share}
            disabled={pending || shared}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-60"
          >
            {shared ? <Check className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
            {shared ? "Sent to coach" : "Share with coach"}
          </button>
        )}
        <a
          href={printHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <Printer className="h-3.5 w-3.5" /> Print / Save PDF
        </a>
      </div>

      {generatedAt && (
        <p className="mt-3 text-[11px] text-[var(--text-muted)]">
          Generated {new Date(generatedAt).toLocaleDateString("en-AU")} · a guide, not medical advice.
        </p>
      )}
    </div>
  );
}

function PlanRow({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] p-4 last:border-0 sm:flex-row sm:gap-4">
      <p className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] sm:w-24 sm:pt-0.5">
        {icon} {label}
      </p>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{text}</p>
    </div>
  );
}
