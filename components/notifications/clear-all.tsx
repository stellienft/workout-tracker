"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { clearAllNotifications } from "@/lib/actions/notifications";

export function ClearAll() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await clearAllNotifications();
          router.refresh();
        })
      }
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" />
      {pending ? "Clearing…" : "Clear all"}
    </button>
  );
}
