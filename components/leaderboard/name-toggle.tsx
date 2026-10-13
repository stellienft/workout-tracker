"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag, VenetianMask } from "lucide-react";
import { setLeaderboardNameHidden } from "@/lib/actions/leaderboard";

export function NameToggle({ hidden }: { hidden: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(hidden);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      await setLeaderboardNameHidden(next);
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title="Show others your full name or a masked version (e.g. I*** H***)"
      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-60"
    >
      {on ? <VenetianMask className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
      {on ? "Name hidden" : "Full name"}
    </button>
  );
}
