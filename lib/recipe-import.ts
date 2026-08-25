/**
 * Parse a recipe from a web page. Almost every recipe site embeds schema.org
 * Recipe structured data as JSON-LD (a <script type="application/ld+json">
 * block), which gives us title, image, ingredients, instructions and nutrition
 * in one go — no API key, no per-site scraping. When that's missing we fall
 * back to OpenGraph tags for at least a title + image.
 */

export interface ParsedRecipe {
  title: string;
  imageUrl: string | null;
  description: string | null;
  ingredients: string[];
  steps: string[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  servings: number;
  prepMinutes: number;
  sourceUrl: string;
}

// ---- small text helpers -------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  deg: "°",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&([a-z0-9]+);/gi, (m, name) => NAMED_ENTITIES[name] ?? m);
}

function safeCodePoint(n: number): string {
  try {
    if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return "";
    return String.fromCodePoint(n);
  } catch {
    return "";
  }
}

/** Strip HTML tags, decode entities and collapse whitespace. */
function cleanText(input: unknown): string {
  if (typeof input !== "string") return "";
  return decodeEntities(input.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** First finite number in a string, e.g. "351 kcal" -> 351, "1,020" -> 1020. */
function firstNumber(input: unknown): number {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (typeof input !== "string") return 0;
  const m = input.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  const n = m ? Number(m[0]) : 0;
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** ISO-8601 duration (PT1H30M) -> minutes. */
function durationToMinutes(input: unknown): number {
  if (typeof input !== "string") return 0;
  const m = input.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return 0;
  const days = Number(m[1] ?? 0);
  const hours = Number(m[2] ?? 0);
  const mins = Number(m[3] ?? 0);
  return days * 1440 + hours * 60 + mins;
}

// ---- JSON-LD extraction -------------------------------------------------

type Json = Record<string, unknown>;

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function typeIncludes(node: Json, type: string): boolean {
  const t = node["@type"];
  if (typeof t === "string") return t.toLowerCase() === type.toLowerCase();
  if (Array.isArray(t))
    return t.some((x) => typeof x === "string" && x.toLowerCase() === type.toLowerCase());
  return false;
}

/** Walk a parsed JSON-LD value (object, array or @graph) for the first Recipe. */
function findRecipeNode(value: unknown): Json | null {
  const stack: unknown[] = [value];
  while (stack.length) {
    const cur = stack.pop();
    if (Array.isArray(cur)) {
      stack.push(...cur);
      continue;
    }
    if (cur && typeof cur === "object") {
      const node = cur as Json;
      if (typeIncludes(node, "Recipe")) return node;
      if (Array.isArray(node["@graph"])) stack.push(...(node["@graph"] as unknown[]));
    }
  }
  return null;
}

function pickImage(image: unknown): string | null {
  const first = asArray(image as unknown[])[0] ?? image;
  if (typeof first === "string") return first;
  if (first && typeof first === "object") {
    const url = (first as Json).url ?? (first as Json).contentUrl;
    if (typeof url === "string") return url;
  }
  return null;
}

/** recipeInstructions comes in many shapes; flatten to plain step strings. */
function pickSteps(instructions: unknown): string[] {
  const out: string[] = [];
  const visit = (v: unknown) => {
    for (const item of asArray(v as unknown[])) {
      if (typeof item === "string") {
        const t = cleanText(item);
        // A single string may hold the whole method separated by newlines.
        if (t) out.push(...t.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean));
      } else if (item && typeof item === "object") {
        const node = item as Json;
        if (typeIncludes(node, "HowToSection") && node.itemListElement) {
          visit(node.itemListElement);
        } else {
          const text = cleanText(node.text ?? node.name);
          if (text) out.push(text);
        }
      }
    }
  };
  visit(instructions);
  return out;
}

function pickIngredients(node: Json): string[] {
  const raw = node.recipeIngredient ?? node.ingredients;
  return asArray(raw as unknown[])
    .map((i) => cleanText(i))
    .filter(Boolean);
}

function pickServings(node: Json): number {
  const y = node.recipeYield ?? node.yield;
  const first = asArray(y as unknown[])[0] ?? y;
  const n = firstNumber(first);
  return n > 0 && n <= 100 ? n : 1;
}

function pickNutrition(node: Json) {
  const n = (node.nutrition && typeof node.nutrition === "object"
    ? node.nutrition
    : {}) as Json;
  return {
    calories: firstNumber(n.calories),
    protein_g: firstNumber(n.proteinContent),
    carbs_g: firstNumber(n.carbohydrateContent),
    fat_g: firstNumber(n.fatContent),
  };
}

/** Pull the JSON out of each <script type="application/ld+json"> block. */
function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // Some sites wrap multiple objects or leave trailing commas — try to
      // recover the first well-formed object.
      try {
        const cleaned = raw.replace(/^﻿/, "").replace(/,\s*([}\]])/g, "$1");
        blocks.push(JSON.parse(cleaned));
      } catch {
        // Skip this malformed block.
      }
    }
  }
  return blocks;
}

function metaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]);
  }
  return null;
}

/**
 * Parse recipe fields out of a page's HTML. Returns null only when we can't
 * even find a title (nothing useful to import).
 */
export function parseRecipeFromHtml(html: string, sourceUrl: string): ParsedRecipe | null {
  const blocks = extractJsonLdBlocks(html);
  let node: Json | null = null;
  for (const b of blocks) {
    node = findRecipeNode(b);
    if (node) break;
  }

  if (node) {
    const nut = pickNutrition(node);
    const title = cleanText(node.name) || metaContent(html, "og:title") || "";
    if (!title) return null;
    const prep =
      durationToMinutes(node.totalTime) ||
      durationToMinutes(node.cookTime) + durationToMinutes(node.prepTime) ||
      0;
    return {
      title: title.slice(0, 140),
      imageUrl: pickImage(node.image) ?? metaContent(html, "og:image"),
      description: (cleanText(node.description) || null)?.slice(0, 500) ?? null,
      ingredients: pickIngredients(node).slice(0, 60),
      steps: pickSteps(node.recipeInstructions).slice(0, 60),
      calories: nut.calories,
      protein_g: nut.protein_g,
      carbs_g: nut.carbs_g,
      fat_g: nut.fat_g,
      servings: pickServings(node),
      prepMinutes: prep,
      sourceUrl,
    };
  }

  // Fallback: no structured recipe data — grab whatever OpenGraph gives us so
  // the member at least gets a titled, imaged entry they can flesh out.
  const ogTitle = metaContent(html, "og:title") || cleanText(titleTag(html));
  if (!ogTitle) return null;
  return {
    title: ogTitle.slice(0, 140),
    imageUrl: metaContent(html, "og:image"),
    description: metaContent(html, "og:description")?.slice(0, 500) ?? null,
    ingredients: [],
    steps: [],
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    servings: 1,
    prepMinutes: 0,
    sourceUrl,
  };
}

function titleTag(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?.[1] ?? "";
}

/**
 * Guard against SSRF: only allow public http(s) URLs, never internal hosts or
 * cloud metadata endpoints.
 */
export function isSafeRecipeUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  )
    return false;
  // Block obvious private / link-local / loopback IP literals.
  if (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "::1" ||
    host.startsWith("fd") ||
    host.startsWith("fe80")
  )
    return false;
  return true;
}
