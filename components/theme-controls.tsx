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
      <div className="mt-3 grid grid-cols-2 gap-3">
        {THEME_PRESETS.map((preset) => {
          const active = selectedId === preset.id;
          const dark = preset.mode === "dark";
          return (
            <button
              key={preset.id}
              onClick={() => choose(preset)}
              aria-pressed={active}
              className={`relative flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                active
                  ? "border-[var(--border-active)]"
                  : "border-[var(--border-subtle)] hover:border-[var(--text-muted)]"
              }`}
            >
              {/* Mini swatch: surface + accent, previewing the theme. */}
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                style={{
                  backgroundColor: dark ? "#141414" : "#ffffff",
                  borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                }}
              >
                <span
                  className="h-5 w-5 rounded-full"
                  style={{ backgroundColor: preset.accentHex }}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-semibold">
                  {dark ? (
                    <Moon className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  ) : (
                    <Sun className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  )}
                  {preset.name}
                </span>
                <span className="mt-0.5 block text-xs capitalize text-[var(--text-muted)]">
                  {preset.mode} · {preset.accentKey} accent
                </span>
              </span>
              {active && (
                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)]">
                  <Check className="h-3.5 w-3.5 text-[var(--accent-ink)]" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
