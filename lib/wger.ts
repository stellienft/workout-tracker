/**
 * wger exercise database client (https://wger.de) — free, open-source, no API
 * key required. We search for exercises and normalize them onto our exercises
 * table shape.
 */

const BASE = "https://wger.de/api/v2";
const EN = 2; // wger English language id

export interface NormalizedExercise {
  externalId: string;
  slug: string;
  name: string;
  category: string; // 'strength' | 'cardio'
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  instructions: string | null;
  imageUrl: string | null;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Map wger's anatomical muscle names onto the simple tokens the app filters by.
const MUSCLE_MAP: Record<string, string> = {
  "biceps brachii": "biceps",
  "triceps brachii": "triceps",
  "pectoralis major": "chest",
  "latissimus dorsi": "lats",
  "trapezius": "back",
  "erector spinae": "back",
  "rectus abdominis": "core",
  "obliquus externus abdominis": "core",
  "quadriceps femoris": "quads",
  "biceps femoris": "hamstrings",
  "gastrocnemius": "calves",
  "soleus": "calves",
  "gluteus maximus": "glutes",
  "anterior deltoid": "shoulders",
  "deltoid": "shoulders",
  "serratus anterior": "chest",
  "brachialis": "biceps",
};
function mapMuscle(name: string): string {
  const key = name.trim().toLowerCase();
  return MUSCLE_MAP[key] ?? key.split(" ")[0];
}

interface WgerMuscle { name?: string; name_en?: string }
interface WgerBaseInfo {
  id: number;
  category?: { name?: string };
  muscles?: WgerMuscle[];
  muscles_secondary?: WgerMuscle[];
  equipment?: { name?: string }[];
  images?: { image?: string; is_main?: boolean }[];
  translations?: { language: number; name?: string; description?: string }[];
  exercises?: { language: number; name?: string; description?: string }[];
}

function normalize(info: WgerBaseInfo): NormalizedExercise | null {
  const translations = info.translations ?? info.exercises ?? [];
  const en = translations.find((t) => t.language === EN) ?? translations[0];
  const name = en?.name?.trim();
  if (!name) return null;

  const muscles = (info.muscles ?? []).map((m) => mapMuscle(m.name_en || m.name || ""));
  const secondary = (info.muscles_secondary ?? []).map((m) =>
    mapMuscle(m.name_en || m.name || "")
  );
  const equipment = (info.equipment ?? [])
    .map((e) => (e.name || "").toLowerCase())
    .filter(Boolean);
  const mainImage =
    info.images?.find((i) => i.is_main)?.image ?? info.images?.[0]?.image ?? null;
  const catName = (info.category?.name ?? "").toLowerCase();

  return {
    externalId: `wger:${info.id}`,
    slug: `${slugify(name)}-wger${info.id}`,
    name,
    category: catName.includes("cardio") ? "cardio" : "strength",
    primaryMuscles: Array.from(new Set(muscles.filter(Boolean))),
    secondaryMuscles: Array.from(new Set(secondary.filter(Boolean))),
    equipment: Array.from(new Set(equipment)),
    instructions: en?.description
      ? en.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000)
      : null,
    imageUrl: mainImage,
  };
}

/** Search wger and return normalized exercises ready to import. */
export async function searchWger(opts: {
  query: string;
  number?: number;
}): Promise<NormalizedExercise[]> {
  const term = opts.query.trim();
  const limit = Math.min(opts.number ?? 10, 20);

  const searchRes = await fetch(
    `${BASE}/exercise/search/?term=${encodeURIComponent(term)}&language=english&format=json`,
    { next: { revalidate: 3600 } }
  );
  if (!searchRes.ok) {
    throw new Error(`wger search error ${searchRes.status}`);
  }
  const search = (await searchRes.json()) as {
    suggestions?: { data?: { base_id?: number; id?: number } }[];
  };
  const baseIds = Array.from(
    new Set(
      (search.suggestions ?? [])
        // wger has shifted this field name across versions; accept either.
        .map((s) => s.data?.base_id ?? s.data?.id)
        .filter((n): n is number => typeof n === "number")
    )
  ).slice(0, limit);

  const out: NormalizedExercise[] = [];
  for (const id of baseIds) {
    try {
      const infoRes = await fetch(`${BASE}/exercisebaseinfo/${id}/?format=json`, {
        next: { revalidate: 3600 },
      });
      if (!infoRes.ok) continue;
      const info = (await infoRes.json()) as WgerBaseInfo;
      const n = normalize(info);
      if (n) out.push(n);
    } catch {
      // skip a failed lookup, keep importing the rest
    }
  }
  return out;
}
