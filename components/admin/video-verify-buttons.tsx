"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { setVideoVerification } from "@/lib/actions/admin";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function VideoVerifyButtons({ videoId }: { videoId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function verify(status: "verified" | "broken") {
    startTransition(async () => {
      const res = await setVideoVerification(videoId, status);
      if (res.ok) {
        toast(status === "verified" ? "Verified." : "Flagged.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Could not update", "error");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => verify("verified")}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-[var(--accent-primary)]"
      >
        <CheckCircle2 className="h-3.5 w-3.5" /> Verify
      </button>
      <button
        onClick={() => verify("broken")}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-[var(--danger)]"
      >
        <AlertCircle className="h-3.5 w-3.5" /> Broken
      </button>
    </div>
  );
}
