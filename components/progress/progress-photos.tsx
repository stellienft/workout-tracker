"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Camera,
  Plus,
  Trash2,
  X,
  GitCompareArrows,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  uploadProgressPhoto,
  deleteProgressPhoto,
} from "@/lib/actions/progress-photos";

export interface ProgressPhoto {
  id: string;
  url: string;
  pose: "front" | "side" | "back" | "other";
  takenOn: string; // ISO date
  weightKg: number | null;
  note: string | null;
}

const POSES = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "back", label: "Back" },
  { value: "other", label: "Other" },
] as const;

export function ProgressPhotos({ photos }: { photos: ProgressPhoto[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [compare, setCompare] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<ProgressPhoto | null>(null);

  function toggleSelect(id: string) {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 2) return [cur[1], id]; // keep newest two
      return [...cur, id];
    });
  }

  const before = photos.find((p) => p.id === selected[0]) ?? null;
  const after = photos.find((p) => p.id === selected[1]) ?? null;

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Camera className="h-4 w-4 text-[var(--accent-primary)]" />
            Progress photos
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Private to you. Track how your body changes over time.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {photos.length >= 2 && (
            <button
              onClick={() => {
                setCompare((c) => !c);
                setSelected([]);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                compare
                  ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-white"
                  : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
              )}
            >
              <GitCompareArrows className="h-4 w-4" /> Compare
            </button>
          )}
          <button
            onClick={() => setAdding((a) => !a)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-black"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {adding && (
        <UploadPanel
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {compare && (
        <div className="mx-5 mb-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3">
          {before && after ? (
            <CompareView before={before} after={after} />
          ) : (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">
              Pick two photos below to see your before &amp; after.
              {selected.length === 1 && " One more to go."}
            </p>
          )}
        </div>
      )}

      <div className="p-5 pt-0">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[var(--border-subtle)] py-10 text-center text-sm text-[var(--text-muted)]">
            <Camera className="mb-1 h-6 w-6" />
            <p>No photos yet.</p>
            <p>Add your first one to start your before &amp; after.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => {
              const idx = selected.indexOf(p.id);
              const selNum = idx === -1 ? null : idx + 1;
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    compare ? toggleSelect(p.id) : setLightbox(p)
                  }
                  className={cn(
                    "group relative aspect-[3/4] overflow-hidden rounded-xl border text-left transition-transform active:scale-[0.98]",
                    selNum
                      ? "border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)]"
                  )}
                >
                  <Image
                    src={p.url}
                    alt={`${p.pose} on ${p.takenOn}`}
                    fill
                    sizes="(max-width: 640px) 33vw, 25vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-[10px] font-semibold text-white">
                      {formatDate(p.takenOn)}
                    </p>
                    <p className="text-[9px] uppercase tracking-wide text-white/60">
                      {p.pose}
                      {p.weightKg != null ? ` · ${p.weightKg} kg` : ""}
                    </p>
                  </div>
                  {compare && selNum && (
                    <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[10px] font-bold text-black">
                      {selNum}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {lightbox && (
        <Lightbox
          photo={lightbox}
          onClose={() => setLightbox(null)}
          onDeleted={() => {
            setLightbox(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function CompareView({
  before,
  after,
}: {
  before: ProgressPhoto;
  after: ProgressPhoto;
}) {
  // Order by date so "before" is always the earlier shot.
  const [a, b] =
    new Date(before.takenOn) <= new Date(after.takenOn)
      ? [before, after]
      : [after, before];
  const delta =
    a.weightKg != null && b.weightKg != null ? b.weightKg - a.weightKg : null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {[a, b].map((p, i) => (
          <div key={p.id}>
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-[var(--border-subtle)]">
              <Image
                src={p.url}
                alt={i === 0 ? "Before" : "After"}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover"
              />
              <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                {i === 0 ? "Before" : "After"}
              </span>
            </div>
            <p className="mt-1 text-center text-xs text-[var(--text-secondary)]">
              {formatDate(p.takenOn)}
              {p.weightKg != null ? ` · ${p.weightKg} kg` : ""}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
        <span>{daysBetween(a.takenOn, b.takenOn)} days apart</span>
        {delta != null && (
          <>
            <ArrowRight className="h-3.5 w-3.5" />
            <span
              className={cn(
                "font-semibold",
                delta < 0
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--text-secondary)]"
              )}
            >
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)} kg
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function UploadPanel({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Please choose a photo.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await uploadProgressPhoto(fd);
    if (res.ok) {
      onDone();
    } else {
      setError(res.error ?? "Couldn't upload. Try again.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-5 mb-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4"
    >
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative flex aspect-[3/4] w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)]"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Preview"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Camera className="h-6 w-6" />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {POSES.map((p, i) => (
              <label
                key={p.value}
                className="cursor-pointer rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs has-[:checked]:border-[var(--border-active)] has-[:checked]:bg-[var(--accent-muted)]"
              >
                <input
                  type="radio"
                  name="pose"
                  value={p.value}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                {p.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              name="takenOn"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="min-w-0 flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-xs text-white focus:border-[var(--border-active)] focus:outline-none"
            />
            <input
              type="number"
              name="weightKg"
              step="0.1"
              placeholder="Weight kg"
              className="w-24 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-xs text-white placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
            />
          </div>
          <input
            type="text"
            name="note"
            maxLength={500}
            placeholder="Note (optional)"
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-xs text-white placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
          />
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[var(--accent-primary)] px-4 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Save photo"}
        </button>
      </div>
    </form>
  );
}

function Lightbox({
  photo,
  onClose,
  onDeleted,
}: {
  photo: ProgressPhoto;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Delete this photo? This can't be undone.")) return;
    setBusy(true);
    const res = await deleteProgressPhoto(photo.id);
    if (res.ok) onDeleted();
    else setBusy(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl bg-[var(--surface-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="relative aspect-[3/4] w-full">
          <Image
            src={photo.url}
            alt={`${photo.pose} on ${photo.takenOn}`}
            fill
            sizes="(max-width: 640px) 100vw, 28rem"
            className="object-contain"
          />
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold">{formatDate(photo.takenOn)}</p>
            <p className="text-xs capitalize text-[var(--text-secondary)]">
              {photo.pose}
              {photo.weightKg != null ? ` · ${photo.weightKg} kg` : ""}
            </p>
            {photo.note && (
              <p className="mt-1 text-xs text-[var(--text-muted)]">{photo.note}</p>
            )}
          </div>
          <button
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--danger)] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> {busy ? "…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysBetween(a: string, b: string) {
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return Math.round(ms / 86_400_000);
}
