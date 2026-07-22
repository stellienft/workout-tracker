"use client";

import { useEffect } from "react";

/**
 * Applies the member's saved appearance (from their profile) on any device.
 * The no-FOUC script in the root layout reads localStorage for the fast path;
 * this reconciles that with the account's stored preference so a freshly
 * signed-in device picks up the right theme + accent.
 */
export function ThemeSync({
  theme,
  accent,
}: {
  theme: "system" | "light" | "dark";
  accent: string;
}) {
  useEffect(() => {
    try {
      localStorage.setItem("stellio-theme", theme);
      localStorage.setItem("stellio-accent", accent);
      const root = document.documentElement;
      const resolved =
        theme === "system"
          ? window.matchMedia("(prefers-color-scheme: light)").matches
            ? "light"
            : "dark"
          : theme;
      root.dataset.theme = resolved;
      root.style.setProperty("--accent-base", accent);
      root.style.setProperty("--color-accent", accent);
    } catch {
      // ignore storage/DOM access issues
    }
  }, [theme, accent]);

  return null;
}
