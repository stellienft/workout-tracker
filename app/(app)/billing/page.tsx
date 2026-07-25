import { requireUser } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import {
  UpgradeButton,
  ManageButton,
  ContinueFree,
} from "@/components/billing/billing-actions";
import { getUserPlan } from "@/lib/entitlements";
import { isBillingConfigured } from "@/lib/stripe";
import { PRO_BENEFITS, PRO_PRICE_LABEL } from "@/lib/plan";
import { Check, Sparkles, Crown } from "lucide-react";

export const metadata = { title: "Membership" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; success?: string }>;
}) {
  await requireUser();
  const { welcome, success } = await searchParams;
  const { isPro, source, currentPeriodEnd } = await getUserPlan();
  const billingReady = isBillingConfigured();

  return (
    <PageShell>
      <PageHeader
        title={welcome ? "You're all set up" : "Membership"}
        subtitle={
          welcome
            ? "One last thing — unlock the full Stellio Fit experience."
            : "Your plan and billing."
        }
      />

      {success && !isPro && (
        <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--accent-primary)]/40 bg-[var(--accent-muted)] p-4 text-sm text-[var(--accent-primary)]">
          Payment received — your Pro features unlock within a few seconds. Refresh
          if they&apos;re not showing yet.
        </div>
      )}

      {isPro ? (
        <div className="mt-6 space-y-6">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-[var(--accent-primary)]" />
              <p className="text-lg font-bold">
                {source === "staff" ? "Full access (staff)" : "Stellio Fit Pro"}
              </p>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {source === "staff"
                ? "Your admin/trainer role includes every feature."
                : "You have every feature unlocked. Thanks for supporting Stellio Fit."}
              {currentPeriodEnd
                ? ` Renews ${new Date(currentPeriodEnd).toLocaleDateString()}.`
                : ""}
            </p>
            {source === "subscription" && billingReady && (
              <div className="mt-4">
                <ManageButton />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-active)] bg-[var(--surface-primary)] p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--accent-primary)]" />
              <p className="text-lg font-bold">Stellio Fit Pro</p>
              <span className="ml-auto text-xl font-extrabold">{PRO_PRICE_LABEL}</span>
            </div>
            <ul className="mt-4 space-y-2">
              {PRO_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
                  <span className="text-[var(--text-secondary)]">{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col items-start gap-3">
              {billingReady ? (
                <UpgradeButton className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] px-5 py-3.5 font-semibold text-black disabled:opacity-60 sm:w-auto sm:px-8" />
              ) : (
                <p className="rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  Online upgrades aren&apos;t switched on yet — check back soon.
                </p>
              )}
              {welcome && <ContinueFree />}
            </div>
          </div>

          <p className="text-center text-xs text-[var(--text-muted)]">
            The Free plan keeps workouts, programs, progress, nutrition and
            achievements. Pro adds the AI Coach and custom Splits.
          </p>
        </div>
      )}
    </PageShell>
  );
}
