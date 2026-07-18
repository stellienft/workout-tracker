"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  upsertExerciseVideo,
  setVideoVerification,
} from "@/lib/actions/admin";
import type { ExerciseVideo } from "@/lib/types";
import { youtubeVideoId, youtubeEmbedUrl } from "@/lib/utils";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function VideoManager({
  exerciseId,
  videos,
}: {
  exerciseId: string;
  videos: ExerciseVideo[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  function checkPreview(u: string) {
    setUrl(u);
    const vid = youtubeVideoId(u);
    setPreview(vid ? youtubeEmbedUrl(vid) : null);
  }

  function add() {
    startTransition(async () => {
      const res = await upsertExerciseVideo({
        exerciseId,
        sourceUrl: url,
        title: title || undefined,
        creatorName: creator || undefined,
      });
      if (res.ok) {
        toast("Video added.", "success");
        setUrl("");
        setTitle("");
        setCreator("");
        setPreview(null);
        router.refresh();
      } else {
        toast(res.error ?? "Could not add", "error");
      }
    });
  }

  function verify(id: string, status: "verified" | "broken") {
    startTransition(async () => {
      const res = await setVideoVerification(id, status);
      if (res.ok) {
        toast(status === "verified" ? "Marked verified." : "Flagged as broken.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Could not update", "error");
      }
    });
  }

  return (
    <div className="mt-3 space-y-4">
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((v) => (
            <div
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {v.title ?? v.source_url}
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {v.source_url}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] ${
                    v.verification_status === "verified"
                      ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                      : v.verification_status === "placeholder"
                        ? "bg-[var(--surface-elevated)] text-[var(--warning)]"
                        : "bg-[var(--surface-elevated)] text-[var(--text-secondary)]"
                  }`}
                >
                  {v.verification_status}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => verify(v.id, "verified")}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-[var(--accent-primary)]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                </button>
                <button
                  onClick={() => verify(v.id, "broken")}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-[var(--danger)]"
                >
                  <AlertCircle className="h-3.5 w-3.5" /> Broken
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
        <p className="text-sm font-semibold">Add / replace video</p>
        <input
          value={url}
          onChange={(e) => checkPreview(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className="mt-3 h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <input
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            placeholder="Creator (optional)"
            className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
        </div>
        {preview && (
          <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl">
            <iframe src={preview} className="h-full w-full" title="Preview" />
          </div>
        )}
        <Button onClick={add} disabled={pending || !url} className="mt-3">
          {pending ? "Saving…" : "Save video"}
        </Button>
      </div>
    </div>
  );
}
