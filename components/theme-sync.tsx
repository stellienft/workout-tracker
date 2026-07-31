"use client";

import { useEffect } from "react";
import { presetFromProfile } from "@/lib/themes";

/**
 * Applies the member's saved theme (from their profile) on any device. The
 * no-FOUC script in the root layout reads localStorage for the fast path; this
 * reconciles that with the account's stored preference so a freshly signed-in
 * device picks up the right theme + accent.
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
      const preset = presetFromProfile(theme, accent);
      localStorage.setItem("stellio-theme", preset.mode);
      localStorage.setItem("stellio-accent", preset.accentKey);
      const root = document.documentElement;
      root.dataset.theme = preset.mode;
      root.dataset.accent = preset.accentKey;
    } catch {
      // ignore storage/DOM access issues
    }
  }, [theme, accent]);

  return null;
}
