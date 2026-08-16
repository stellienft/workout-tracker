"use client";

import { useState, useTransition } from "react";
import { Share2, Check } from "lucide-react";
import { createPost } from "@/lib/actions/social";
import { useToast } from "@/components/ui/toast";

/**
 * One-tap "share this workout to the feed" for the post-workout summary.
 * Posts the linked session (no media) — available to all members.
 */
export function ShareWorkoutButton({
  sessionId,
  defaultCaption,
}: {
  sessionId: string;
  defaultCaption: string;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [shared, setShared] = useState(false);

  function share() {
    start(async () => {
      const res = await createPost({
        workoutSessionId: sessionId,
        caption: defaultCaption,
        mediaType: "none",
      });
      if (res.ok) {
        setShared(true);
        toast("Shared to the feed!", "success");
      } else {
        toast(res.error ?? "Could not share", "error");
      }
    });
  }

  return (
    <button
      onClick={share}
      disabled={pending || shared}
      className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-subtle)] py-3.5 text-sm font-medium disabled:opacity-60"
    >
      {shared ? (
        <>
          <Check className="h-4 w-4 text-[var(--accent-primary)]" /> Shared to feed
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" /> {pending ? "Sharing…" : "Share to feed"}
        </>
      )}
    </button>
  );
}
