"use client";

import { useEffect } from "react";

// Minimal shape of the Wake Lock API — not in every TS DOM lib target yet.
type Sentinel = { release: () => Promise<void>; released?: boolean };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<Sentinel> };
};

/**
 * Keep the device screen awake while `active` is true — e.g. for the duration
 * of a workout, so the phone doesn't sleep between sets. The platform releases
 * the lock automatically whenever the page is hidden, so we re-acquire it on
 * return to the foreground. No-op where the Wake Lock API is unavailable
 * (older browsers, some iOS versions) or when the request is denied.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined") return;
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;

    let sentinel: Sentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const s = await nav.wakeLock!.request("screen");
        if (cancelled) {
          s.release().catch(() => {});
        } else {
          sentinel = s;
        }
      } catch {
        // Denied (e.g. battery saver) — silently skip.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible" && !sentinel) request();
    };

    request();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
