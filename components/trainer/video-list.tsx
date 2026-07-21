"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { addTrainerVideo } from "@/lib/actions/trainer";

interface TrainerVideo {
  id: string;
  title: string;
  source_url: string | null;
  thumbnail_url: string | null;
}

export function TrainerVideoList({ tenantId, videos }: { tenantId: string; videos?: TrainerVideo[] }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");

  function add() {
    startTransition(async () => {
      const res = await addTrainerVideo({ title, sourceUrl, notes });
      if (res.ok) {
        toast("Video added.", "success");
        setTitle("");
        setSourceUrl("");
        setNotes("");
        setShowForm(false);
      } else {
        toast(res.error ?? "Could not add", "error");
      }
    });
  }

  return (
    <div className="space-y-3">
      {videos && videos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {videos.map((v) => (
            <div
              key={v.id}
              className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
            >
              {v.thumbnail_url && (
                <img src={v.thumbnail_url} alt={v.title} className="h-24 w-full object-cover" />
              )}
              <div className="p-3">
                <h3 className="text-sm font-medium">{v.title}</h3>
                {v.source_url && (
                  <a
                    href={v.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-xs text-[var(--accent-primary)]"
                  >
                    View on YouTube →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Video title"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="YouTube URL (https://youtube.com/watch?v=…)"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <div className="flex gap-2">
            <Button onClick={add} disabled={pending || !title || !sourceUrl} size="lg" className="flex-1">
              {pending ? "Adding…" : "Add video"}
            </Button>
            <Button onClick={() => setShowForm(false)} variant="secondary" size="lg">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-2xl border border-dashed border-[var(--border-subtle)] py-4 text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-white"
        >
          + Add a video
        </button>
      )}
    </div>
  );
}
