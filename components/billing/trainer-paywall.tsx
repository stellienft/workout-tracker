import { Briefcase, Check } from "lucide-react";
import { PageShell } from "@/components/ui/page-header";
import { UpgradeButton } from "@/components/billing/billing-actions";
import { isTrainerBillingConfigured } from "@/lib/stripe";
import { TRAINER_BENEFITS, TRAINER_PRICE_LABEL } from "@/lib/plan";

/** Shown to trainers who don't yet hold an active Trainer subscription. */
export function TrainerPaywall() {
  const ready = isTrainerBillingConfigured();
  return (
    <PageShell>
      <div className="mx-auto max-w-md py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-muted)]">
          <Briefcase className="h-8 w-8 text-[var(--accent-primary)]" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Trainer plan</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Run your coaching business on Stellio Fit for {TRAINER_PRICE_LABEL} —
          cancel anytime.
        </p>

        <ul className="mt-6 space-y-2 text-left">
          {TRAINER_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
              <span className="text-[var(--text-secondary)]">{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          {ready ? (
            <UpgradeButton
              label={`Start Trainer plan — ${TRAINER_PRICE_LABEL}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] px-5 py-3.5 font-semibold text-black disabled:opacity-60"
            />
          ) : (
            <p className="rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              The Trainer plan isn&apos;t switched on yet — check back soon.
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
