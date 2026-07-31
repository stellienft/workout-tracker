/**
 * The four curated Stellio Fit themes. Each pairs a light/dark mode with a
 * fixed accent — there is no free-form theme customisation. `mode` maps to the
 * profile's theme_preference, `accentHex` to accent_color, and `accentKey`
 * drives the `data-accent` attribute the CSS keys its accent palette on.
 */
export type ThemeMode = "light" | "dark";
export type AccentKey = "lime" | "peach" | "blue" | "grey";

export interface ThemePreset {
  id: string;
  name: string;
  mode: ThemeMode;
  accentKey: AccentKey;
  accentHex: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "midnight-lime", name: "Midnight Lime", mode: "dark", accentKey: "lime", accentHex: "#ccff30" },
  { id: "midnight-peach", name: "Midnight Peach", mode: "dark", accentKey: "peach", accentHex: "#ffb27a" },
  { id: "daylight-blue", name: "Daylight Blue", mode: "light", accentKey: "blue", accentHex: "#3b82f6" },
  { id: "daylight-grey", name: "Daylight Grey", mode: "light", accentKey: "grey", accentHex: "#64748b" },
];

export const ACCENT_HEX: Record<AccentKey, string> = {
  lime: "#ccff30",
  peach: "#ffb27a",
  blue: "#3b82f6",
  grey: "#64748b",
};

const HEX_TO_ACCENT: Record<string, AccentKey> = {
  "#ccff30": "lime",
  "#ffb27a": "peach",
  "#3b82f6": "blue",
  "#64748b": "grey",
};

/** Map a stored accent hex to one of the four keys (default by mode). */
export function accentKeyFromHex(hex: string | null | undefined, mode: ThemeMode): AccentKey {
  const key = hex ? HEX_TO_ACCENT[hex.toLowerCase()] : undefined;
  if (key) return key;
  return mode === "light" ? "blue" : "lime";
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
