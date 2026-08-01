"use client";

import { useEffect, useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { saveThemePreference } from "@/lib/actions/theme";
import { THEME_PRESETS, presetFromProfile, type ThemePreset } from "@/lib/themes";

function apply(preset: ThemePreset) {
  const r = document.documentElement;
  r.dataset.theme = preset.mode;
  r.dataset.accent = preset.accentKey;
}

export function ThemeControls({
  initialTheme = "dark",
  initialAccent = "#ccff30",
}: {
  initialTheme?: "system" | "light" | "dark";
  initialAccent?: string;
}) {
  const [selectedId, setSelectedId] = useState(
    () => presetFromProfile(initialTheme, initialAccent).id
  );

  // The profile is the source of truth (syncs across devices); reconcile it
  // into localStorage + the live document so this device matches the account.
  useEffect(() => {
    const preset = presetFromProfile(initialTheme, initialAccent);
    localStorage.setItem("stellio-theme", preset.mode);
    localStorage.setItem("stellio-accent", preset.accentKey);
    apply(preset);
    setSelectedId(preset.id);
  }, [initialTheme, initialAccent]);

  function choose(preset: ThemePreset) {
    setSelectedId(preset.id);
    localStorage.setItem("stellio-theme", preset.mode);
    localStorage.setItem("stellio-accent", preset.accentKey);
    apply(preset);
    void saveThemePreference({ theme: preset.mode, accentColor: preset.accentHex });
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <p className="text-sm font-medium">Theme</p>
      <p className="text-xs text-[var(--text-muted)]">
        Pick one of our four looks — two dark, two light.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {THEME_PRESETS.map((preset) => (
          <ThemeCard
            key={preset.id}
            preset={preset}
            active={selectedId === preset.id}
            onSelect={() => choose(preset)}
          />
        ))}
      </div>
    </div>
  );
}

// Per-mode preview surfaces (fixed colours so each card previews its own theme
// regardless of the theme currently applied to the page).
const PREVIEW = {
  dark: { bg: "#131313", surface: "#242424", line: "rgba(255,255,255,0.22)" },
  light: { bg: "#eceef1", surface: "#ffffff", line: "rgba(0,0,0,0.14)" },
} as const;

// Bright accents take dark ink; deeper accents take white — mirrors --accent-ink.
const INK: Record<string, string> = {
  lime: "#0d0d0d",
  peach: "#0d0d0d",
  blue: "#ffffff",
  grey: "#ffffff",
};

function ThemeCard({
  preset,
  active,
  onSelect,
}: {
  preset: ThemePreset;
  active: boolean;
  onSelect: () => void;
}) {
  const dark = preset.mode === "dark";
  const p = PREVIEW[preset.mode];
  const ink = INK[preset.accentKey] ?? "#0d0d0d";

  return (
    <button
      onClick={onSelect}
      aria-pressed={active}
      className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition-all ${
        active
          ? "border-transparent ring-2 ring-[var(--accent-primary)]"
          : "border-[var(--border-subtle)] hover:border-[var(--text-muted)]"
      }`}
    >
      {/* Live mini-preview of the theme: background, a surface card with an
          accent dot + text lines, and an accent button. */}
      <div className="relative p-3" style={{ backgroundColor: p.bg }}>
        <div
          className="rounded-lg p-2"
          style={{ backgroundColor: p.surface, boxShadow: dark ? "none" : "0 1px 2px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: preset.accentHex }}
            />
            <span className="flex-1 space-y-1">
              <span className="block h-1.5 w-3/4 rounded-full" style={{ backgroundColor: p.line }} />
              <span className="block h-1.5 w-1/2 rounded-full" style={{ backgroundColor: p.line }} />
            </span>
          </div>
        </div>
        <div
          className="mt-2 flex h-5 items-center justify-center rounded-md text-[9px] font-bold"
          style={{ backgroundColor: preset.accentHex, color: ink }}
        >
          Button
        </div>
        {active && (
          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] shadow">
            <Check className="h-3.5 w-3.5 text-[var(--accent-ink)]" />
          </span>
        )}
      </div>

      {/* Label */}
      <div className="flex items-center gap-1.5 bg-[var(--surface-primary)] px-3 py-2.5">
        {dark ? (
          <Moon className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
        ) : (
          <Sun className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold leading-tight">
            {preset.name}
          </span>
          <span className="block truncate text-[11px] capitalize text-[var(--text-muted)]">
            {preset.mode} · {preset.accentKey} accent
          </span>
        </span>
      </div>
    </button>
  );
}
