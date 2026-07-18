"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { setUserRole, removeUserRole } from "@/lib/actions/admin";

export function UserRoleControls({
  userId,
  isAdmin,
}: {
  userId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function grant() {
    startTransition(async () => {
      const res = await setUserRole(userId, "admin");
      if (res.ok) {
        toast("Admin role granted.", "success");
        router.refresh();
      } else toast(res.error ?? "Failed", "error");
    });
  }

  function revoke() {
    startTransition(async () => {
      const res = await removeUserRole(userId, "admin");
      if (res.ok) {
        toast("Admin role removed.", "success");
        router.refresh();
      } else toast(res.error ?? "Failed", "error");
    });
  }

  return isAdmin ? (
    <button
      onClick={revoke}
      disabled={pending}
      className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--danger)]"
    >
      Remove admin
    </button>
  ) : (
    <button
      onClick={grant}
      disabled={pending}
      className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--accent-primary)]"
    >
      Make admin
    </button>
  );
}
