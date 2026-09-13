"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Music, X } from "lucide-react";

interface Playing {
  isPlaying: boolean;
  title: string;
  artist: string;
  albumArt: string | null;
  trackUrl: string | null;
}

type State =
  | { kind: "loading" }
  | { kind: "disconnected" }
  | { kind: "idle" } // connected, nothing playing
  | { kind: "playing"; track: Playing };

const DISMISS_KEY = "stellio-spotify-connect-dismissed";

/**
 * Compact "now playing from Spotify" strip for workout mode. Polls the
 * server every 20s (and on tab focus). Hidden entirely when the member has
 * dismissed the connect prompt and isn't connected.
 */
export function SpotifyNowPlaying() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [dismissed, setDismissed] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/now-playing", { cache: "no-store" });
      if (!res.ok) {
        setState({ kind: "disconnected" });
        return;
      }
      const data = (await res.json()) as {
        connected: boolean;
        playing: Playing | null;
      };
      if (!data.connected) setState({ kind: "disconnected" });
      else if (!data.playing) setState({ kind: "idle" });
      else setState({ kind: "playing", track: data.playing });
    } catch {
      setState({ kind: "disconnected" });
    }
  }, []);

  useEffect(() => {
    poll();
    timer.current = setInterval(poll, 20_000);
    const onVis = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [poll]);

  // Nothing to show: still loading, connected-but-idle, or a dismissed prompt.
  if (state.kind === "loading" || state.kind === "idle") return null;

  if (state.kind === "disconnected") {
    if (dismissed) return null;
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2">
        <Music className="h-4 w-4 shrink-0 text-[#1DB954]" />
        <a
          href="/api/spotify/login?return=/settings"
          className="flex-1 text-sm font-medium text-[var(--text-secondary)]"
        >
          Connect Spotify to see your track
        </a>
        <button
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // ignore
            }
            setDismissed(true);
          }}
          aria-label="Dismiss"
          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const { track } = state;
  const inner = (
    <>
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-secondary)]">
        {track.albumArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.albumArt} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Music className="h-4 w-4 text-[var(--text-muted)]" />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-tight">
          {track.title}
        </span>
        <span className="block truncate text-xs text-[var(--text-muted)]">
          {track.artist}
        </span>
      </span>
      <Equalizer playing={track.isPlaying} />
    </>
  );

  const className =
    "flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2";

  return track.trackUrl ? (
    <a href={track.trackUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <div className={className}>{inner}</div>
  );
}

/** Three little bars that pulse while a track is playing (CSS-only). */
function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span className="flex h-4 shrink-0 items-end gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-[#1DB954]"
          style={
            playing
              ? {
                  height: "100%",
                  animation: `stellio-eq 0.9s ease-in-out ${i * 0.18}s infinite`,
                  transformOrigin: "bottom",
                }
              : { height: "35%" }
          }
        />
      ))}
      <style>{`@keyframes stellio-eq{0%,100%{transform:scaleY(0.35)}50%{transform:scaleY(1)}}`}</style>
    </span>
  );
}
