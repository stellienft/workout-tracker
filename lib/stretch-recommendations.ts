// Pre-workout stretch recommendations.
//
// Given the muscles a workout actually trains (derived from its exercises'
// primary muscles), pick a short list of relevant stretches so a leg day
// surfaces quad/hamstring/glute/calf stretches, a push day surfaces
// chest/shoulder/triceps stretches, and so on. Slugs reference real rows in
// the `exercises` table (each has an image + instructions), so the UI can show
// a picture and how-to for every stretch.

/**
 * Ordered stretch candidates per trained muscle. The first entries are the
 * preferred picks; later ones are used to top the list up to a minimum when a
 * workout only hits one or two muscle groups. Every slug exists in the
 * exercises table with a cover image and instructions.
 */
export const STRETCH_BY_MUSCLE: Record<string, string[]> = {
  chest: [
    "chest-and-front-of-shoulder-stretch-edb1271",
    "behind-head-chest-stretch-edb1259",
    "dynamic-chest-stretch-male-edb1167",
  ],
  shoulders: [
    "rear-deltoid-stretch-edb0669",
    "chest-and-front-of-shoulder-stretch-edb1271",
    "behind-head-chest-stretch-edb1259",
  ],
  triceps: ["overhead-triceps-stretch-edb0643", "triceps-stretch-edb0817"],
  // No dedicated biceps stretch in the library — a front-of-arm/shoulder opener
  // is the closest fit.
  biceps: [
    "chest-and-front-of-shoulder-stretch-edb1271",
    "behind-head-chest-stretch-edb1259",
  ],
  back: [
    "upper-back-stretch-edb1365",
    "spine-stretch-edb1363",
    "roller-back-stretch-edb2208",
  ],
  lats: [
    "kneeling-lat-stretch-edb1346",
    "exercise-ball-lat-stretch-edb1339",
    "standing-lateral-stretch-edb0794",
  ],
  traps: ["side-neck-stretch-edb0713", "front-and-back-neck-stretch-edb0462"],
  quads: [
    "all-fours-squad-stretch-edb1512",
    "lying-side-quads-stretch-edb0613",
    "assisted-prone-lying-quads-stretch-edb1713",
  ],
  hamstrings: [
    "hamstring-stretch-edb1511",
    "leg-up-hamstring-stretch-edb1576",
    "runners-stretch-edb1585",
  ],
  glutes: [
    "seated-glute-stretch-edb1424",
    "assisted-lying-glutes-stretch-edb1709",
    "iron-cross-stretch-edb1419",
  ],
  calves: [
    "standing-calves-calf-stretch-edb1398",
    "calf-stretch-with-hands-against-wall-edb1377",
    "seated-calf-stretch-male-edb1390",
  ],
  core: ["spine-stretch-edb1363", "seated-lower-back-stretch-edb0690"],
  forearms: ["side-wrist-pull-stretch-edb0721"],
  hip_flexors: ["hip-flexor-stretch-kneeling"],
};

/** Friendly label for a trained-muscle key (used as the stretch's tag). */
export function muscleLabel(muscle: string): string {
  const map: Record<string, string> = {
    lats: "lats",
    traps: "traps",
    core: "core",
    hip_flexors: "hip flexors",
    "levator scapulae": "neck",
  };
  return map[muscle] ?? muscle;
}

export interface RecommendedStretchRef {
  slug: string;
  muscle: string;
}

/**
 * Order the trained muscles by how much the workout emphasises them (most sets
 * first), then pick one stretch per muscle, up to `max`. Tops the list up to a
 * sensible minimum when few muscle groups are hit. Pure + deterministic.
 */
export function recommendStretchSlugs(
  muscleSequence: string[],
  max = 4,
  min = 3,
): RecommendedStretchRef[] {
  // Count appearances to rank muscles, preserving first-seen order on ties.
  const counts = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  muscleSequence.forEach((m, i) => {
    counts.set(m, (counts.get(m) ?? 0) + 1);
    if (!firstSeen.has(m)) firstSeen.set(m, i);
  });
  const ranked = [...counts.keys()].sort((a, b) => {
    const diff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
    return diff !== 0 ? diff : (firstSeen.get(a) ?? 0) - (firstSeen.get(b) ?? 0);
  });

  const out: RecommendedStretchRef[] = [];
  const used = new Set<string>();

  // First pass: one stretch per muscle, most-trained first.
  for (const muscle of ranked) {
    if (out.length >= max) break;
    const slug = (STRETCH_BY_MUSCLE[muscle] ?? []).find((s) => !used.has(s));
    if (slug) {
      out.push({ slug, muscle });
      used.add(slug);
    }
  }

  // Top-up: keep adding extra stretches from the trained muscles (a second or
  // third stretch for the same group is fine) until we reach `min` or run out
  // of candidates — so a single-muscle day still gets a useful set.
  const target = Math.min(min, max);
  let progressed = true;
  while (out.length < target && progressed) {
    progressed = false;
    for (const muscle of ranked) {
      if (out.length >= target) break;
      const slug = (STRETCH_BY_MUSCLE[muscle] ?? []).find((s) => !used.has(s));
      if (slug) {
        out.push({ slug, muscle });
        used.add(slug);
        progressed = true;
      }
    }
  }

  return out.slice(0, max);
}
