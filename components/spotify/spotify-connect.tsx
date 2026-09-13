"use client";

import { useState, useTransition } from "react";
import { Music, Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { disconnectSpotify } from "@/lib/actions/spotify";
import { useRouter } from "next/navigation";

export function SpotifyConnect({
  configured,
  connected,
}: {
  configured: boolean;
  connected: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [isConnected, setIsConnected] = useState(connected);

  function disconnect() {
    startTransition(async () => {
      const res = await disconnectSpotify();
      if (res.ok) {
        setIsConnected(false);
        toast("Spotify disconnected.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Could not disconnect", "error");
      }
    });
  }

  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1DB954]/15 text-[#1DB954]">
        <Music className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Spotify</p>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          {!configured
            ? "Not available yet — the app owner needs to add Spotify credentials."
            : isConnected
              ? "Connected — your current track shows during workouts."
              : "Connect to show your currently-playing track during workouts."}
        </p>
      </div>
      {configured &&
        (isConnected ? (
          <button
            onClick={disconnect}
            disabled={pending}
            className="shrink-0 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-60"
          >
            {pending ? "…" : "Disconnect"}
          </button>
        ) : (
          <a
            href="/api/spotify/login?return=/settings"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#1DB954] px-4 py-2 text-sm font-semibold text-black"
          >
            Connect
          </a>
        ))}
      {configured && isConnected && (
        <Check className="hidden h-5 w-5 shrink-0 text-[#1DB954] sm:block" />
      )}
    </div>
  );
}
