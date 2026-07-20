"use client";

import { useTransition } from "react";
import { KeyRound } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { sendUserPasswordReset } from "@/lib/actions/admin";

export function UserResetPassword({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function reset() {
    if (!confirm(`Send a password reset email to ${email}?`)) return;
    startTransition(async () => {
      const res = await sendUserPasswordReset(userId);
      if (res.ok) {
        toast(`Reset link sent to ${email}.`, "success");
      } else {
        toast(res.error ?? "Failed to send reset", "error");
      }
    });
  }

  return (
    <button
      onClick={reset}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
    >
      <KeyRound className="h-3.5 w-3.5" /> {pending ? "Sending…" : "Reset password"}
    </button>
  );
}
