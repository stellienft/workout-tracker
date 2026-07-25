import { requireUser, getAuthContext, isTrainerRole } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import {
  UpgradeButton,
  ManageButton,
  ContinueFree,
} from "@/components/billing/billing-actions";
import { getUserPlan } from "@/lib/entitlements";
import { isBillingConfigured, isTrainerBillingConfigured } from "@/lib/stripe";
import {
  PRO_BENEFITS,
  PRO_PRICE_LABEL,
  FREE_INCLUDES,
  FREE_TRAINER_INCLUDES,
  TRAINER_BENEFITS,
  TRAINER_PRICE_LABEL,
} from "@/lib/plan";
import { Check, Sparkles, Crown, Briefcase } from "lucide-react";

export const metadata = { title: "Membership" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; success?: string }>;
}) {
  await requireUser();
  const { roles } = await getAuthContext();
  const isTrainer = isTrainerRole(roles);
  const { welcome, success } = await searchParams;
  const { isPro, source, currentPeriodEnd } = await getUserPlan();
  const billingReady = isTrainer ? isTrainerBillingConfigured() : isBillingConfigured();

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
                {source === "staff"
                  ? "Full access (staff)"
                  : source === "coaching"
                    ? "Pro — included with your coach"
                    : source === "trial"
                      ? "Pro — free month"
                      : isTrainer
                        ? "Trainer plan"
                        : "Stellio Fit Pro"}
              </p>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {source === "staff"
                ? "Your admin/trainer role includes every feature."
                : source === "coaching"
                  ? "Your coaching package includes full Pro access. Manage it with your coach."
                  : source === "trial"
                    ? "You've got Pro free from a referral. Invite more friends to extend it, or subscribe to keep it after."
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
      ) : isTrainer ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Free trainer */}
            <div className="flex flex-col rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold">Free</p>
                <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  Current plan
                </span>
              </div>
              <p className="mt-1 text-2xl font-extrabold">
                $0
                <span className="text-sm font-medium text-[var(--text-muted)]">/mo</span>
              </p>
              <ul className="mt-4 space-y-2">
                {FREE_TRAINER_INCLUDES.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-secondary)]">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trainer plan */}
            <div className="flex flex-col rounded-[var(--radius-card)] border border-[var(--border-active)] bg-[var(--surface-primary)] p-6 ring-1 ring-[var(--accent-primary)]/25">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-[var(--accent-primary)]" />
                  <p className="text-lg font-bold">Trainer plan</p>
                </div>
                <span className="text-xl font-extrabold">{TRAINER_PRICE_LABEL}</span>
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
                Everything in Free, plus
              </p>
              <ul className="mt-3 space-y-2">
                {TRAINER_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
                    <span className="text-[var(--text-secondary)]">{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-3">
                {billingReady ? (
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
          </div>

          {welcome && (
            <div className="text-center">
              <ContinueFree />
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Free */}
            <div className="flex flex-col rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold">Free</p>
                <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  Current plan
                </span>
              </div>
              <p className="mt-1 text-2xl font-extrabold">
                $0
                <span className="text-sm font-medium text-[var(--text-muted)]">/mo</span>
              </p>
              <ul className="mt-4 space-y-2">
                {FREE_INCLUDES.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-secondary)]">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div className="flex flex-col rounded-[var(--radius-card)] border border-[var(--border-active)] bg-[var(--surface-primary)] p-6 ring-1 ring-[var(--accent-primary)]/25">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[var(--accent-primary)]" />
                  <p className="text-lg font-bold">Pro</p>
                </div>
                <span className="text-xl font-extrabold">{PRO_PRICE_LABEL}</span>
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
                Everything in Free, plus
              </p>
              <ul className="mt-3 space-y-2">
                {PRO_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
                    <span className="text-[var(--text-secondary)]">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-3">
                {billingReady ? (
                  <UpgradeButton className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] px-5 py-3.5 font-semibold text-black disabled:opacity-60" />
                ) : (
                  <p className="rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                    Online upgrades aren&apos;t switched on yet — check back soon.
                  </p>
                )}
              </div>
            </div>
          </div>

          {welcome && (
            <div className="text-center">
              <ContinueFree />
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
