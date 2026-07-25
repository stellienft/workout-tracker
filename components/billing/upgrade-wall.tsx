import { Lock, Check } from "lucide-react";
import { PageShell } from "@/components/ui/page-header";
import { UpgradeButton } from "@/components/billing/billing-actions";
import { FEATURE_LABEL, PRO_BENEFITS, PRO_PRICE_LABEL, type Feature } from "@/lib/plan";

/** Full-page lock shown when a Free member opens a Pro-only feature. */
export function UpgradeWall({ feature }: { feature: Feature }) {
  return (
    <PageShell>
      <div className="mx-auto max-w-md py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-muted)]">
          <Lock className="h-8 w-8 text-[var(--accent-primary)]" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">{FEATURE_LABEL[feature]} is a Pro feature</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Upgrade to Stellio Fit Pro for {PRO_PRICE_LABEL} to unlock it — cancel
          anytime.
        </p>

        <ul className="mt-6 space-y-2 text-left">
          {PRO_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
              <span className="text-[var(--text-secondary)]">{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <UpgradeButton className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] px-5 py-3.5 font-semibold text-black disabled:opacity-60" />
        </div>
      </div>
    </PageShell>
  );
}
