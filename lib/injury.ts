/**
 * Personalised injury awareness. Instead of a single global "shoulder-safe"
 * flag, we read the member's own stated concerns (free text like "sore lower
 * back" or "right knee") and match them against each exercise's muscles, so the
 * caution is relevant to THEM.
 */

export interface ConcernArea {
  label: string;
  muscles: string[];
}

// Keyword -> body area -> the muscle tokens an exercise would load for it.
// Order matters: more specific phrases first.
const AREA_MAP: { keywords: string[]; label: string; muscles: string[] }[] = [
  { keywords: ["lower back", "lumbar", "spine"], label: "lower back", muscles: ["back", "lats", "glutes", "hamstrings"] },
  { keywords: ["upper back", "trap"], label: "upper back", muscles: ["back", "lats", "shoulders"] },
  { keywords: ["rotator", "shoulder", "delt"], label: "shoulder", muscles: ["shoulders", "chest"] },
  { keywords: ["knee"], label: "knee", muscles: ["quads", "hamstrings", "calves"] },
  { keywords: ["hip", "groin"], label: "hip", muscles: ["glutes", "quads", "hamstrings"] },
  { keywords: ["wrist"], label: "wrist", muscles: ["forearms", "chest", "triceps"] },
  { keywords: ["elbow"], label: "elbow", muscles: ["triceps", "biceps", "forearms"] },
  { keywords: ["ankle"], label: "ankle", muscles: ["calves"] },
  { keywords: ["neck"], label: "neck", muscles: ["shoulders", "back"] },
  { keywords: ["hamstring"], label: "hamstring", muscles: ["hamstrings"] },
  { keywords: ["quad"], label: "quad", muscles: ["quads"] },
  { keywords: ["glute"], label: "glute", muscles: ["glutes"] },
  { keywords: ["calf", "calves"], label: "calf", muscles: ["calves"] },
  { keywords: ["bicep"], label: "bicep", muscles: ["biceps"] },
  { keywords: ["tricep"], label: "tricep", muscles: ["triceps"] },
  { keywords: ["chest", "pec"], label: "chest", muscles: ["chest"] },
  { keywords: ["core", "abs", "abdomen", "oblique"], label: "core", muscles: ["core"] },
  // Generic "back" last so it doesn't shadow "lower/upper back".
  { keywords: ["back"], label: "back", muscles: ["back", "lats"] },
];

// The body areas a member can pick at onboarding / in settings. Each value
// matches a label in AREA_MAP so it maps straight to the muscles to be careful
// with. Keep this user-friendly and ordered head-to-toe.
export const INJURY_AREAS: { value: string; label: string }[] = [
  { value: "neck", label: "Neck" },
  { value: "shoulder", label: "Shoulder" },
  { value: "upper back", label: "Upper back" },
  { value: "lower back", label: "Lower back" },
  { value: "elbow", label: "Elbow" },
  { value: "wrist", label: "Wrist" },
  { value: "chest", label: "Chest" },
  { value: "hip", label: "Hip" },
  { value: "hamstring", label: "Hamstring" },
  { value: "knee", label: "Knee" },
  { value: "calf", label: "Calf" },
  { value: "ankle", label: "Ankle" },
];

/** Map the structured picked areas straight to their concern areas. */
export function concernsFromAreas(areas: string[] | null | undefined): ConcernArea[] {
  if (!areas || areas.length === 0) return [];
  const found: ConcernArea[] = [];
  for (const area of areas) {
    const a = AREA_MAP.find((m) => m.label === area || m.keywords.includes(area));
    if (a && !found.some((f) => f.label === a.label)) {
      found.push({ label: a.label, muscles: a.muscles });
    }
  }
  return found;
}

/** Merge the picked areas with any free-text note into one concern list. */
export function combineConcerns(
  areas: string[] | null | undefined,
  text: string | null | undefined
): ConcernArea[] {
  const merged = [...concernsFromAreas(areas)];
  for (const c of parseConcerns(text)) {
    if (!merged.some((m) => m.label === c.label)) merged.push(c);
  }
  return merged;
}

/** Parse free-text considerations into the affected areas we recognise. */
export function parseConcerns(text: string | null | undefined): ConcernArea[] {
  if (!text) return [];
  const t = text.toLowerCase();
  const found: ConcernArea[] = [];
  for (const a of AREA_MAP) {
    if (a.keywords.some((k) => t.includes(k))) {
      if (!found.some((f) => f.label === a.label)) {
        found.push({ label: a.label, muscles: a.muscles });
      }
    }
  }
  return found;
}

/**
 * The concern label an exercise may aggravate given the member's areas, or null.
 * Matches on the exercise's muscles.
 */
export function exerciseConcern(
  concerns: ConcernArea[],
  exerciseMuscles: string[]
): string | null {
  if (concerns.length === 0) return null;
  const muscles = new Set(exerciseMuscles.map((m) => m.toLowerCase()));
  for (const c of concerns) {
    if (c.muscles.some((m) => muscles.has(m))) return c.label;
  }
  return null;
}
