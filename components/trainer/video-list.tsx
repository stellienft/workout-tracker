"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Youtube, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { addTrainerVideo, recordTrainerVideoUpload } from "@/lib/actions/trainer";

const VIDEO_BUCKET = "trainer-videos";
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/ogg"];

function extFor(file: File) {
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/quicktime") return "mov";
  if (file.type === "video/ogg") return "ogv";
  if (file.type === "video/mp4") return "mp4";
  // Fall back to the file's own extension, else mp4.
  const dot = file.name.lastIndexOf(".");
  return dot > -1 ? file.name.slice(dot + 1).toLowerCase() : "mp4";
}

interface TrainerVideo {
  id: string;
  title: string;
  source_url: string | null;
  thumbnail_url: string | null;
  provider?: string | null;
}

type Mode = "link" | "upload";

export function TrainerVideoList({
  tenantId,
  videos,
}: {
  tenantId: string;
  videos?: TrainerVideo[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<Mode>("link");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle("");
    setSourceUrl("");
    setNotes("");
    setFile(null);
    setShowForm(false);
  }

  function submitLink() {
    startTransition(async () => {
      const res = await addTrainerVideo({ title, sourceUrl, notes });
      if (res.ok) {
        toast("Video added.", "success");
        reset();
        router.refresh();
      } else {
        toast(res.error ?? "Could not add", "error");
      }
    });
  }

  function submitUpload() {
    if (!file) {
      toast("Choose a video file.", "error");
      return;
    }
    if (file.type && !VIDEO_TYPES.includes(file.type)) {
      toast("Unsupported format. Use MP4, WebM or MOV.", "error");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast("Video is too large (max 500 MB).", "error");
      return;
    }
    const theFile = file;
    startTransition(async () => {
      // Upload straight to storage from the browser — large files can't go
      // through a Server Action (request-body limits), which was crashing this.
      const supabase = createClient();
      const path = `${tenantId}/${crypto.randomUUID()}.${extFor(theFile)}`;
      const { error: upErr } = await supabase.storage
        .from(VIDEO_BUCKET)
        .upload(path, theFile, {
          contentType: theFile.type || "video/mp4",
          upsert: false,
        });
      if (upErr) {
        toast(upErr.message || "Upload failed", "error");
        return;
      }
      const res = await recordTrainerVideoUpload({
        title,
        notes,
        storagePath: path,
      });
      if (res.ok) {
        toast("Video uploaded.", "success");
        reset();
        router.refresh();
      } else {
        // Remove the orphaned object if we couldn't record it.
        await supabase.storage.from(VIDEO_BUCKET).remove([path]);
        toast(res.error ?? "Could not save video", "error");
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
              {v.provider === "upload" && v.source_url ? (
                <video
                  src={v.source_url}
                  controls
                  preload="metadata"
                  className="aspect-video w-full bg-black"
                />
              ) : v.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.thumbnail_url}
                  alt={v.title}
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-[var(--surface-secondary)]">
                  <Youtube className="h-6 w-6 text-[var(--text-muted)]" />
                </div>
              )}
              <div className="p-3">
                <h3 className="text-sm font-medium">{v.title}</h3>
                {v.provider !== "upload" && v.source_url && (
                  <a
                    href={v.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-xs text-[var(--accent-primary)]"
                  >
                    View on YouTube →
                  </a>
                )}
                {v.provider === "upload" && (
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    Uploaded
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          {/* Source toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: "link", label: "YouTube link", icon: Youtube },
                { key: "upload", label: "Upload file", icon: Upload },
              ] as const
            ).map((o) => {
              const Icon = o.icon;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setMode(o.key)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                    mode === o.key
                      ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {o.label}
                </button>
              );
            })}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Video title"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />

          {mode === "link" ? (
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="YouTube URL (https://youtube.com/watch?v=…)"
              className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
            />
          ) : (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/ogg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-subtle)] px-3 py-4 text-center text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)]"
              >
                <Upload className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {file
                    ? file.name
                    : "Choose a video (MP4, WebM, MOV — up to 500 MB)"}
                </span>
              </button>
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />

          <div className="flex gap-2">
            <Button
              onClick={mode === "link" ? submitLink : submitUpload}
              disabled={
                pending || !title || (mode === "link" ? !sourceUrl : !file)
              }
              size="lg"
              className="flex-1"
            >
              {pending
                ? mode === "upload"
                  ? "Uploading…"
                  : "Adding…"
                : mode === "upload"
                  ? "Upload video"
                  : "Add video"}
            </Button>
            <Button onClick={reset} variant="secondary" size="lg">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-2xl border border-dashed border-[var(--border-subtle)] py-4 text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
        >
          + Add a video
        </button>
      )}
    </div>
  );
}
