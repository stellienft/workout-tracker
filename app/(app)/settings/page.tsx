import Link from "next/link";
import {
  Crown,
  Sparkles,
  ChevronRight,
  Shield,
  FileText,
  Gift,
  Mail,
} from "lucide-react";
import { requireUser, getAuthContext, isTrainerRole } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import {
  PRO_PRICE_LABEL,
  TRAINER_PRICE_LABEL,
} from "@/lib/plan";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { SettingsForm } from "@/components/settings-form";
import { ThemeControls } from "@/components/theme-controls";
import { PushToggle } from "@/components/settings/push-toggle";
import { AccountDataControls } from "@/components/settings/account-data";
import { FeedbackForm } from "@/components/settings/feedback-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireUser();
  const { profile, roles } = await getAuthContext();
  const isTrainer = isTrainerRole(roles);
  const { isPro, source, currentPeriodEnd } = await getUserPlan();

  const planName = !isPro
    ? "Free"
    : source === "staff"
      ? "Full access (staff)"
      : source === "coaching"
        ? "Pro — included with your coach"
        : source === "trial"
          ? "Pro — free month"
          : isTrainer
            ? "Trainer plan"
            : "Stellio Fit Pro";

  const planNote = !isPro
    ? isTrainer
      ? `Start the Trainer plan (${TRAINER_PRICE_LABEL}) to run your coaching business.`
      : `Upgrade to Pro (${PRO_PRICE_LABEL}) to unlock every feature.`
    : source === "subscription" && currentPeriodEnd
      ? `Renews ${new Date(currentPeriodEnd).toLocaleDateString()}.`
      : source === "trial" && currentPeriodEnd
        ? `Free access until ${new Date(currentPeriodEnd).toLocaleDateString()}.`
        : source === "coaching"
          ? "Included with your coaching package."
          : "You have every feature unlocked.";

  return (
    <PageShell>
      <PageHeader title="Settings" subtitle="Preferences and account." />

      {/* Billing & membership */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold">Billing &amp; membership</h2>
        <Link
          href="/billing"
          className="flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 transition-colors hover:border-[var(--border-active)]"
        >
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              isPro
                ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
            }`}
          >
            {isPro ? (
              <Crown className="h-5 w-5" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="font-semibold">{planName}</span>
              {!isPro && (
                <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                  Current plan
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-sm text-[var(--text-muted)]">
              {planNote}
            </span>
          </span>
          <span className="shrink-0 text-sm font-medium text-[var(--accent-primary)]">
            {isPro ? "Manage" : "Upgrade"}
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />
        </Link>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold">Notifications</h2>
        <PushToggle />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold">Appearance</h2>
        <ThemeControls
          initialTheme={profile?.theme_preference ?? "dark"}
          initialAccent={profile?.accent_color ?? "#ccff30"}
        />
      </div>

      <div className="mt-6">
        <SettingsForm
          initial={{
            fullName: profile?.full_name ?? "",
            unitPreference: profile?.unit_preference ?? "metric",
            hapticsEnabled: profile?.haptics_enabled ?? true,
            medicationTracking: profile?.medication_tracking_enabled ?? false,
            dailyQuote: profile?.daily_quote_enabled ?? true,
            motivationPush: profile?.motivation_push_enabled ?? false,
            feedNotifications: profile?.feed_notifications_enabled ?? false,
            feedAutoshare: profile?.feed_autoshare_enabled ?? false,
            injuryAreas: profile?.injury_areas ?? [],
            considerations: profile?.considerations ?? "",
            timezone: profile?.timezone ?? "Australia/Brisbane",
          }}
        />
      </div>

      {/* Feedback */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold">Feedback</h2>
        <FeedbackForm defaultEmail={profile?.email ?? ""} />
      </div>

      {/* Legal & support links */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold">Legal &amp; support</h2>
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
          <SettingsLink
            href="/referrals"
            icon={<Gift className="h-5 w-5" />}
            label="Refer a friend"
            hint="Give a free month, get a free month"
          />
          <SettingsLink
            href="/legal/privacy"
            icon={<Shield className="h-5 w-5" />}
            label="Privacy Policy"
          />
          <SettingsLink
            href="/legal/terms"
            icon={<FileText className="h-5 w-5" />}
            label="Terms of Service"
          />
          <SettingsLink
            href="mailto:hello@stellio.com.au"
            icon={<Mail className="h-5 w-5" />}
            label="Contact support"
            hint="hello@stellio.com.au"
            external
          />
        </div>
      </div>

      {/* Account & data */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold">Account &amp; data</h2>
        <AccountDataControls />
      </div>
    </PageShell>
  );
}

function SettingsLink({
  href,
  icon,
  label,
  hint,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  external?: boolean;
}) {
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {hint && (
          <span className="block text-xs text-[var(--text-muted)]">{hint}</span>
        )}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />
    </>
  );
  const className =
    "flex items-center gap-3 border-b border-[var(--border-subtle)] p-4 last:border-0 transition-colors hover:bg-[var(--surface-secondary)]";

  if (external) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
