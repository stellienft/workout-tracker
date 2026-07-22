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

async function getJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Search wger and return normalized exercises ready to import. */
export async function searchWger(opts: {
  query: string;
  number?: number;
}): Promise<NormalizedExercise[]> {
  const term = encodeURIComponent(opts.query.trim());
  const limit = Math.min(opts.number ?? 10, 20);

  // wger has shifted its search endpoint/params across versions — try the
  // known variants and use the first that responds.
  const searchUrls = [
    `${BASE}/exercise/search/?term=${term}&format=json`,
    `${BASE}/exercise/search/?term=${term}&language=english&format=json`,
    `${BASE}/exercise/search/?term=${term}&language=2&format=json`,
  ];
  type SearchResp = { suggestions?: { data?: { base_id?: number; id?: number } }[] };
  let search: SearchResp | null = null;
  for (const u of searchUrls) {
    const json = await getJson(u);
    if (json && typeof json === "object" && "suggestions" in json) {
      search = json as SearchResp;
      break;
    }
  }
  if (!search) {
    throw new Error(
      "wger search endpoint unavailable (their API may have changed)."
    );
  }

  const baseIds = Array.from(
    new Set(
      (search.suggestions ?? [])
        .map((s) => s.data?.base_id ?? s.data?.id)
        .filter((n): n is number => typeof n === "number")
    )
  ).slice(0, limit);

  const out: NormalizedExercise[] = [];
  for (const id of baseIds) {
    // Detail endpoint name has also changed across versions — try both.
    const info =
      ((await getJson(`${BASE}/exerciseinfo/${id}/?format=json`)) as WgerBaseInfo | null) ??
      ((await getJson(`${BASE}/exercisebaseinfo/${id}/?format=json`)) as WgerBaseInfo | null);
    if (!info) continue;
    const n = normalize(info);
    if (n) out.push(n);
  }
  return out;
}
