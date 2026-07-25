"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function ReferralShare({ link }: { link: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Couldn't copy — long-press to copy the link.", "error");
    }
  }

  async function share() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({
          title: "Stellio Fit",
          text: "Join me on Stellio Fit — here's a free month of Pro:",
          url: link,
        });
      } catch {
        /* cancelled */
      }
    } else {
      copy();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-2">
        <span className="min-w-0 flex-1 truncate px-2 text-sm text-[var(--text-secondary)]">
          {link}
        </span>
        <button
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--surface-primary)] px-3 py-2 text-sm font-medium"
        >
          {copied ? <Check className="h-4 w-4 text-[var(--accent-primary)]" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <button
        onClick={share}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] px-5 py-3 font-semibold text-black sm:w-auto sm:px-8"
      >
        <Share2 className="h-4 w-4" /> Share your invite
      </button>
    </div>
  );
}
