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

          {/* People you've referred */}
          <div>
            <h2 className="mb-2 text-lg font-bold">People you&apos;ve referred</h2>
            {res.referred.length === 0 ? (
              <p className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 text-sm text-[var(--text-muted)]">
                No one recorded yet. A referral only counts when your friend signs
                up in the same browser they opened your link in — see the note below.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
                {res.referred.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-4">
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-sm font-bold text-[var(--accent-primary)]">
                        {r.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium">{r.name}</span>
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(r.joinedAt).toLocaleDateString("en-AU")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Your code: <span className="font-mono font-semibold">{res.code}</span>.
            Free months stack — invite more friends to keep Pro going. A referral
            is credited when your friend signs up in the same browser they opened
            your link in; sign-ups on another device or via Google can miss it.
          </p>
        </div>
      )}
    </PageShell>
  );
}
