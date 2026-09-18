"use client";

import { Music, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";

export interface HubTrack {
  isPlaying: boolean;
  title: string;
  artist: string;
  albumArt: string | null;
}

/**
 * Now-playing card with touch transport controls — voice is the primary input,
 * but nobody wants to say "pause" twice when the speaker is loud.
 */
export function MusicCard({
  track,
  connected,
  onControl,
  onVolume,
}: {
  track: HubTrack | null;
  connected: boolean;
  onControl: (action: "pause" | "resume" | "next" | "previous") => void;
  onVolume: (direction: "up" | "down") => void;
}) {
  if (!connected) {
    return (
      <div className="card flex items-center gap-4 p-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-secondary)]">
          <Music className="h-6 w-6 text-[#1DB954]" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">Spotify not connected</p>
          <a
            href="/api/spotify/login?return=/hub"
            className="text-sm text-[var(--accent-primary)] underline underline-offset-4"
          >
            Connect to play music by voice
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[var(--surface-secondary)]">
          {track?.albumArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.albumArt} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <Music className="h-6 w-6 text-[var(--text-muted)]" />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">
            {track?.title ?? "Nothing playing"}
          </p>
          <p className="truncate text-sm text-[var(--text-secondary)]">
            {track?.artist ?? "Say “play something” to start"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <TransportButton label="Previous" onClick={() => onControl("previous")}>
          <SkipBack className="h-5 w-5" />
        </TransportButton>
        <TransportButton
          label={track?.isPlaying ? "Pause" : "Play"}
          primary
          onClick={() => onControl(track?.isPlaying ? "pause" : "resume")}
        >
          {track?.isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </TransportButton>
        <TransportButton label="Next" onClick={() => onControl("next")}>
          <SkipForward className="h-5 w-5" />
        </TransportButton>

        <span className="ml-auto flex items-center gap-2">
          <TransportButton label="Volume down" onClick={() => onVolume("down")}>
            <span className="text-lg font-bold">−</span>
          </TransportButton>
          <Volume2 className="h-5 w-5 text-[var(--text-muted)]" />
          <TransportButton label="Volume up" onClick={() => onVolume("up")}>
            <span className="text-lg font-bold">+</span>
          </TransportButton>
        </span>
      </div>
    </div>
  );
}

function TransportButton({
  children,
  label,
  primary,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex items-center justify-center rounded-2xl transition-colors ${
        primary
          ? "h-14 w-16 bg-[var(--accent-primary)] text-[var(--accent-ink)]"
          : "h-12 w-12 bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
      }`}
    >
      {children}
    </button>
  );
}
