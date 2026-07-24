"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { drawAchievementCard, shareOrDownload } from "@/lib/share-card";
import type { AchGroup } from "@/lib/achievements";

const EMOJI: Record<AchGroup, string> = {
  Streaks: "🔥",
  Attendance: "🎖️",
  "Personal records": "🏆",
  Milestones: "🏋️",
  Body: "⚖️",
  Cardio: "🏃",
};

const KICKER: Record<AchGroup, string> = {
  Streaks: "Streak unlocked",
  Attendance: "Milestone reached",
  "Personal records": "New personal record",
  Milestones: "Milestone reached",
  Body: "Body milestone",
  Cardio: "Cardio best",
};

export function ShareAchievement({
  group,
  title,
  description,
  dateLabel,
  label,
}: {
  group: AchGroup;
  title: string;
  description: string;
  dateLabel?: string;
  label?: string; // when set, renders a full labelled button instead of an icon
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function onShare() {
    setBusy(true);
    try {
      const blob = await drawAchievementCard({
        emoji: EMOJI[group],
        kicker: KICKER[group],
        title,
        subtitle: description,
        footnote: dateLabel,
      });
      if (!blob) throw new Error("render failed");
      const result = await shareOrDownload(
        blob,
        "stellio-fit-achievement.png",
        title
      );
      if (result === "downloaded") toast("Image saved — share it anywhere.", "success");
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast("Couldn't share — try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (label) {
    return (
      <button
        onClick={onShare}
        disabled={busy}
        className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-subtle)] py-3.5 text-sm font-medium disabled:opacity-50"
      >
        <Share2 className="h-4 w-4" /> {busy ? "Preparing…" : label}
      </button>
    );
  }

  return (
    <button
      onClick={onShare}
      disabled={busy}
      aria-label="Share achievement"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
    >
      <Share2 className="h-4 w-4" />
    </button>
  );
}
