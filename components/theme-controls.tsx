"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun, Check } from "lucide-react";
import { saveThemePreference } from "@/lib/actions/theme";

type Theme = "system" | "light" | "dark";

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const ACCENTS: { name: string; value: string }[] = [
  { name: "Lime", value: "#ccff30" },
  { name: "Emerald", value: "#22c55e" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
];

const DEFAULT_ACCENT = "#ccff30";

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  return theme;
}

function apply(theme: Theme, accent: string) {
  const r = document.documentElement;
  r.dataset.theme = resolveTheme(theme);
  r.style.setProperty("--accent-primary", accent);
  r.style.setProperty("--color-accent", accent);
}

export function ThemeControls({
  initialTheme = "system",
  initialAccent = DEFAULT_ACCENT,
}: {
  initialTheme?: Theme;
  initialAccent?: string;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [accent, setAccent] = useState<string>(initialAccent);

  // The profile is the source of truth (syncs across devices); reconcile it
  // into localStorage + the live document so this device matches the account.
  useEffect(() => {
    localStorage.setItem("stellio-theme", initialTheme);
    localStorage.setItem("stellio-accent", initialAccent);
    apply(initialTheme, initialAccent);
    setTheme(initialTheme);
    setAccent(initialAccent);
  }, [initialTheme, initialAccent]);

  // Re-resolve on system changes while in "system" mode.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => apply("system", accent);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, accent]);

  function chooseTheme(t: Theme) {
    setTheme(t);
    localStorage.setItem("stellio-theme", t);
    apply(t, accent);
    void saveThemePreference({ theme: t });
  }

  function chooseAccent(a: string) {
    setAccent(a);
    localStorage.setItem("stellio-accent", a);
    apply(theme, a);
    void saveThemePreference({ accentColor: a });
  }

  return (
    <div className="space-y-5 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div>
        <p className="text-sm font-medium">Theme</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = theme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => chooseTheme(t.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-colors ${
                  active
                    ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                    : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                <Icon className="h-5 w-5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Accent colour</p>
        <p className="text-xs text-[var(--text-muted)]">
          Personalise the highlight colour across the app.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          {ACCENTS.map((a) => {
            const active = accent.toLowerCase() === a.value.toLowerCase();
            return (
              <button
                key={a.value}
                onClick={() => chooseAccent(a.value)}
                aria-label={a.name}
                title={a.name}
                className={`flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-[var(--surface-primary)] transition-transform hover:scale-105 ${
                  active ? "ring-white" : "ring-transparent"
                }`}
                style={{ backgroundColor: a.value }}
              >
                {active && <Check className="h-4 w-4 text-black" />}
              </button>
            );
          })}
          <label
            className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[var(--border-subtle)]"
            title="Custom colour"
            style={{
              background:
                "conic-gradient(red, orange, yellow, lime, cyan, blue, magenta, red)",
            }}
          >
            <input
              type="color"
              value={accent}
              onChange={(e) => chooseAccent(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          {accent.toLowerCase() !== DEFAULT_ACCENT && (
            <button
              onClick={() => chooseAccent(DEFAULT_ACCENT)}
              className="ml-1 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
