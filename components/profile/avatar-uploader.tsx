"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { saveAvatarUrl } from "@/lib/actions/profile";

const BUCKET = "avatars";
const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX = 5 * 1024 * 1024;

export function AvatarUploader({
  userId,
  name,
  email,
  avatarUrl,
}: {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(avatarUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(file: File) {
    if (file.type && !TYPES.includes(file.type)) {
      toast("Use a PNG, JPG or WebP image.", "error");
      return;
    }
    if (file.size > MAX) {
      toast("Image is too large (max 5 MB).", "error");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const dot = file.name.lastIndexOf(".");
      const ext = dot > -1 ? file.name.slice(dot + 1).toLowerCase() : "jpg";
      // Overwrite a single per-user file, cache-busted on save.
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
      if (upErr) {
        toast(upErr.message || "Upload failed", "error");
        return;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const busted = `${data.publicUrl}?v=${Date.now()}`;
      const res = await saveAvatarUrl(busted);
      if (res.ok) {
        setUrl(busted);
        toast("Profile photo updated.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Could not save", "error");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={pending}
      className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-full"
      aria-label="Change profile photo"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[var(--accent-muted)] text-xl font-bold text-[var(--accent-primary)]">
          {(name || email || "?").charAt(0).toUpperCase()}
        </span>
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
        <Camera className="h-5 w-5 text-white" />
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
        }}
      />
    </button>
  );
}
