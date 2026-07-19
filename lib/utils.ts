import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function repDisplay(ex: {
  rep_min: number | null;
  rep_max: number | null;
  rep_target: string | null;
}): string {
  if (ex.rep_target) return ex.rep_target;
  if (ex.rep_min && ex.rep_max && ex.rep_min !== ex.rep_max)
    return `${ex.rep_min}–${ex.rep_max} reps`;
  if (ex.rep_min) return `${ex.rep_min} reps`;
  return "—";
}

/**
 * Resolve a cover image reference to a URL. Supports two forms:
 *  - a full http(s) URL (e.g. a curated Pexels/Unsplash image) — returned as-is
 *  - a storage path inside the Supabase `media` bucket — expanded to its public URL
 */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/media/${path}`;
}

/** Extract a YouTube video ID from common URL shapes. */
export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com") || u.hostname.endsWith("youtube-nocookie.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]{6,})/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(videoId: string): string {
  // privacy-enhanced mode
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function startOfWeek(date: Date): Date {
  // Monday-start weeks
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
