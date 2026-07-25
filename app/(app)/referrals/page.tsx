import { requireUser } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { ReferralShare } from "@/components/referrals/referral-share";
import { getMyReferral } from "@/lib/actions/referrals";
import { Gift, Users, Sparkles } from "lucide-react";

export const metadata = { title: "Refer a friend" };

export default async function ReferralsPage() {
  await requireUser();
  const res = await getMyReferral();

  return (
    <PageShell>
      <PageHeader
        title="Refer a friend"
        subtitle="Give a free month, get a free month."
      />

      {!res.ok ? (
        <p className="mt-8 text-sm text-[var(--text-muted)]">
          We couldn&apos;t load your referral link. Please try again.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-active)] bg-[var(--surface-primary)] p-6 ring-1 ring-[var(--accent-primary)]/25">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-[var(--accent-primary)]" />
              <p className="font-semibold">1 month of Pro, free — for both of you</p>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Share your link. When a friend signs up, they get their first month of
              Pro free — and you get a free month too.
            </p>
            <div className="mt-4">
              <ReferralShare link={res.link} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <Users className="h-4 w-4" />
                <span className="text-xs">Friends joined</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{res.joined}</p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs">Free Pro until</span>
              </div>
              <p className="mt-1 text-lg font-bold">
                {res.proUntil
                  ? new Date(res.proUntil).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Your code: <span className="font-mono font-semibold">{res.code}</span>.
            Free months stack — invite more friends to keep Pro going.
          </p>
        </div>
      )}
    </PageShell>
  );
}
