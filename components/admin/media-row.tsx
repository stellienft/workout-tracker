"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { updateMediaStatus } from "@/lib/actions/admin";
import { mediaUrl } from "@/lib/utils";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

export function MediaRow({
  asset,
}: {
  asset: { id: string; storage_path: string; alt_text: string | null; status: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(asset.status);
  const url = mediaUrl(asset.storage_path);

  function change(next: string) {
    setStatus(next);
    startTransition(async () => {
      const res = await updateMediaStatus(asset.id, next);
      if (res.ok) toast("Media updated.", "success");
      else {
        setStatus(asset.status);
        toast(res.error ?? "Failed", "error");
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-elevated)]">
        {url && status === "published" ? (
          <Image src={url} alt={asset.alt_text ?? ""} fill sizes="56px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs">{asset.storage_path}</p>
        <p className="truncate text-xs text-[var(--text-muted)]">
          {asset.alt_text}
        </p>
      </div>
      <select
        value={status}
        onChange={(e) => change(e.target.value)}
        disabled={pending}
        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2 py-1.5 text-xs"
      >
        {["draft", "published", "archived"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
