"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Gift } from "lucide-react";

/** Stores a ?ref=CODE invite in a cookie so it survives signup/OAuth, then
 * shows a "free month" banner. The referral is redeemed after onboarding. */
export function CaptureRef() {
  const params = useSearchParams();
  const ref = params.get("ref");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!ref) return;
    const code = ref.toUpperCase().slice(0, 12);
    // 30-day cookie; readable by server actions.
    document.cookie = `ref_code=${encodeURIComponent(code)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    setShow(true);
  }, [ref]);

  if (!show) return null;
  return (
    <div className="mb-6 flex items-center gap-2 rounded-2xl border border-[var(--border-active)] bg-[var(--accent-muted)] p-3 text-sm text-[var(--accent-primary)]">
      <Gift className="h-4 w-4 shrink-0" />
      You&apos;ve been invited — your first month of Pro is on us.
    </div>
  );
}
