"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { setLeaderboardOptIn } from "@/lib/actions/leaderboard";

export function OptInToggle({ optedIn }: { optedIn: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(optedIn);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      await setLeaderboardOptIn(next);
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-60"
    >
      {on ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      {on ? "Visible on board" : "Hidden"}
    </button>
  );
}
