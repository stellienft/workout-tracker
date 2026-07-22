/**
 * ExerciseDB client (via RapidAPI). Needs EXERCISEDB_API_KEY in the environment
 * (a RapidAPI key). Returns exercises with animated GIF demos, target muscles,
 * equipment and step-by-step instructions.
 */

const BASE = "https://exercisedb.p.rapidapi.com";
const HOST = "exercisedb.p.rapidapi.com";

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

function headers() {
  const key = process.env.EXERCISEDB_API_KEY;
  if (!key) throw new Error("EXERCISEDB_API_KEY is not configured");
  return { "X-RapidAPI-Key": key, "X-RapidAPI-Host": HOST };
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Map ExerciseDB target/secondary muscle names onto the app's simple tokens.
const MUSCLE_MAP: Record<string, string> = {
  pectorals: "chest",
  "serratus anterior": "chest",
  lats: "lats",
  "upper back": "back",
  traps: "back",
  "spine": "back",
  biceps: "biceps",
  brachialis: "biceps",
  triceps: "triceps",
  delts: "shoulders",
  quads: "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  adductors: "quads",
  abductors: "glutes",
  calves: "calves",
  abs: "core",
  forearms: "forearms",
  "cardiovascular system": "cardio",
  levator: "shoulders",
};
function mapMuscle(name: string): string {
  const key = (name || "").trim().toLowerCase();
  return MUSCLE_MAP[key] ?? key;
}

interface EdbExercise {
  id?: string;
  name?: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  gifUrl?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
}

function normalize(e: EdbExercise): NormalizedExercise | null {
  if (!e?.name || !e.id) return null;
  const primary = [mapMuscle(e.target ?? "")].filter(Boolean);
  const secondary = (e.secondaryMuscles ?? []).map(mapMuscle).filter(Boolean);
  return {
    externalId: `exercisedb:${e.id}`,
    slug: `${slugify(e.name)}-edb${e.id}`,
    name: titleCase(e.name),
    category: (e.bodyPart ?? "").toLowerCase() === "cardio" ? "cardio" : "strength",
    primaryMuscles: Array.from(new Set(primary)),
    secondaryMuscles: Array.from(new Set(secondary)),
    equipment: [String(e.equipment ?? "").toLowerCase()].filter(Boolean),
    instructions: Array.isArray(e.instructions)
      ? e.instructions.join(" ").slice(0, 2000)
      : null,
    imageUrl: e.gifUrl ?? null,
  };
}

async function getList(url: string): Promise<EdbExercise[]> {
  const res = await fetch(url, { headers: headers(), next: { revalidate: 3600 } });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`ExerciseDB error ${res.status}${t ? `: ${t.slice(0, 140)}` : ""}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as EdbExercise[]) : [];
}

/** Search ExerciseDB by name (partial match). */
export async function searchExerciseDb(opts: {
  query: string;
  number?: number;
}): Promise<NormalizedExercise[]> {
  const limit = Math.min(opts.number ?? 10, 25);
  const list = await getList(
    `${BASE}/exercises/name/${encodeURIComponent(opts.query.trim().toLowerCase())}?limit=${limit}&offset=0`
  );
  return list
    .map(normalize)
    .filter((x): x is NormalizedExercise => x !== null)
    .slice(0, limit);
}

/** List exercises for a body part (used by the starter seed). */
export async function listByBodyPart(
  bodyPart: string,
  number: number
): Promise<NormalizedExercise[]> {
  const list = await getList(
    `${BASE}/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=${number}&offset=0`
  );
  return list.map(normalize).filter((x): x is NormalizedExercise => x !== null);
}
