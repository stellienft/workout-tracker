/**
 * The curated Aries Fitness themes. Each pairs a light/dark mode with a fixed
 * accent — there is no free-form theme customisation. `mode` maps to the
 * profile's theme_preference, `accentHex` to accent_color, and `accentKey`
 * drives the `data-accent` attribute the CSS keys its accent palette on.
 * Orange is the flagship brand accent and the default in both modes.
 */
export type ThemeMode = "light" | "dark";
export type AccentKey = "orange" | "peach" | "blue" | "grey";

export interface ThemePreset {
  id: string;
  name: string;
  mode: ThemeMode;
  accentKey: AccentKey;
  accentHex: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "aries-dark", name: "Aries Dark", mode: "dark", accentKey: "orange", accentHex: "#f26a1b" },
  { id: "aries-light", name: "Aries Light", mode: "light", accentKey: "orange", accentHex: "#f26a1b" },
  { id: "midnight-peach", name: "Midnight Peach", mode: "dark", accentKey: "peach", accentHex: "#ffb27a" },
  { id: "daylight-blue", name: "Daylight Blue", mode: "light", accentKey: "blue", accentHex: "#3b82f6" },
];

export const ACCENT_HEX: Record<AccentKey, string> = {
  orange: "#f26a1b",
  peach: "#ffb27a",
  blue: "#3b82f6",
  grey: "#64748b",
};

const HEX_TO_ACCENT: Record<string, AccentKey> = {
  "#f26a1b": "orange",
  // Legacy lime accent migrates to the new orange brand colour.
  "#ccff30": "orange",
  "#ffb27a": "peach",
  "#3b82f6": "blue",
  "#64748b": "grey",
};

/** Map a stored accent hex to one of the keys (default: orange brand accent). */
export function accentKeyFromHex(hex: string | null | undefined, _mode: ThemeMode): AccentKey {
  const key = hex ? HEX_TO_ACCENT[hex.toLowerCase()] : undefined;
  if (key) return key;
  return "orange";
}

/** Resolve a stored (theme_preference, accent_color) pair to a preset. */
export function presetFromProfile(
  theme: string | null | undefined,
  accent: string | null | undefined
): ThemePreset {
  const mode: ThemeMode = theme === "light" ? "light" : "dark";
  const accentKey = accentKeyFromHex(accent, mode);
  return (
    THEME_PRESETS.find((p) => p.mode === mode && p.accentKey === accentKey) ??
    THEME_PRESETS[0]
  );
}
