"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Settings } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createCheckoutSession, createPortalSession } from "@/lib/actions/billing";

export function UpgradeButton({
  label = "Upgrade to Pro",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function go() {
    startTransition(async () => {
      const res = await createCheckoutSession();
      if (res.ok && res.url) {
        window.location.href = res.url;
      } else {
        toast(res.error ?? "Couldn't start checkout", "error");
      }
    });
  }

  return (
    <button
      onClick={go}
      disabled={pending}
      className={
        className ??
        "inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] px-5 py-3 font-semibold text-[var(--accent-ink)] disabled:opacity-60"
      }
    >
      <Sparkles className="h-4 w-4" />
      {pending ? "Starting…" : label}
    </button>
  );
}

export function ManageButton() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function go() {
    startTransition(async () => {
      const res = await createPortalSession();
      if (res.ok && res.url) {
        window.location.href = res.url;
      } else {
        toast(res.error ?? "Couldn't open billing", "error");
      }
    });
  }

  return (
    <button
      onClick={go}
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-subtle)] px-5 py-3 text-sm font-medium disabled:opacity-60"
    >
      <Settings className="h-4 w-4" />
      {pending ? "Opening…" : "Manage subscription"}
    </button>
  );
}

/** "Continue on Free" — used on the post-onboarding paywall. */
export function ContinueFree() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/dashboard")}
      className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
    >
      Maybe later — continue on Free
    </button>
  );
}
