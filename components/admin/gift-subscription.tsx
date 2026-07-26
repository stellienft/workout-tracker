"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { grantPro, revokePro } from "@/lib/actions/admin";
import { Gift, X } from "lucide-react";

const QUICK_OPTIONS = [7, 30, 90, 365];

export function GiftSubscription({
  userId,
  currentGrant,
}: {
  userId: string;
  currentGrant: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(30);
  const toast = useToast();

  function gift() {
    startTransition(async () => {
      const res = await grantPro({ targetUserId: userId, days });
      if (res.ok) {
        toast(`Gifted ${days} days of Pro.`, "success");
        setOpen(false);
      } else {
        toast(res.error ?? "Failed", "error");
      }
    });
  }

  function revoke() {
    if (!confirm("Revoke gifted Pro access?")) return;
    startTransition(async () => {
      const res = await revokePro(userId);
      if (res.ok) {
        toast("Pro access revoked.", "success");
      } else {
        toast(res.error ?? "Failed", "error");
      }
    });
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
        >
          <Gift className="h-3.5 w-3.5" /> Gift Pro
        </button>
        {currentGrant && (
          <button
            onClick={revoke}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-subtle)] p-3">
      <span className="text-xs font-medium">Gift days:</span>
      {QUICK_OPTIONS.map((d) => (
        <button
          key={d}
          onClick={() => setDays(d)}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            days === d
              ? "bg-[var(--accent-primary)] text-black"
              : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {d === 365 ? "1 year" : `${d}d`}
        </button>
      ))}
      <input
        type="number"
        value={days}
        onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
        min={1}
        max={3650}
        className="h-8 w-16 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2 text-xs focus:border-[var(--border-active)] focus:outline-none"
      />
      <Button onClick={gift} disabled={pending} size="sm" className="gap-1">
        <Gift className="h-3 w-3" /> Confirm
      </Button>
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        Cancel
      </button>
    </div>
  );
}
