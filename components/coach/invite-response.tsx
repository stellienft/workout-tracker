"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { respondToInvite } from "@/lib/actions/trainer";

export function InviteResponse({
  membershipId,
  coachName,
  tagline,
  logoUrl,
}: {
  membershipId: string;
  coachName: string;
  tagline: string | null;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function respond(accept: boolean) {
    startTransition(async () => {
      const res = await respondToInvite({ membershipId, accept });
      if (res.ok) {
        toast(accept ? "You're connected with your coach!" : "Invite declined.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Something went wrong", "error");
      }
    });
  }

  return (
    <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--border-active)] bg-[var(--accent-muted)] p-6">
      <div className="flex items-center gap-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={coachName}
            className="h-14 w-14 rounded-2xl bg-[var(--surface-primary)] object-contain"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-primary)] text-xl font-bold text-[var(--accent-primary)]">
            {coachName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
            Coaching invite
          </p>
          <h2 className="truncate text-xl font-bold">{coachName}</h2>
          {tagline && (
            <p className="truncate text-sm text-[var(--text-secondary)]">{tagline}</p>
          )}
        </div>
      </div>
      <p className="mt-4 text-sm text-[var(--text-secondary)]">
        {coachName} invited you to train with them. Accept to see the plans and
        videos they share with you.
      </p>
      <div className="mt-4 flex gap-2">
        <Button
          onClick={() => respond(true)}
          disabled={pending}
          size="lg"
          className="flex-1"
        >
          {pending ? "Please wait…" : "Accept invite"}
        </Button>
        <Button
          onClick={() => respond(false)}
          disabled={pending}
          variant="secondary"
          size="lg"
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
