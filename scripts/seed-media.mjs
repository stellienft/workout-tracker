#!/usr/bin/env node
/**
 * Stellio Fit — generate + upload on-brand cover images.
 *
 * Generates a deterministic lime-on-charcoal cover for every cover_image_path
 * referenced in the database (goals, programs, workouts, exercises) and
 * uploads it to the Supabase `media` bucket, then marks the media_assets rows
 * published. Textless by design — the UI overlays each title over the image.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=xxxxx node scripts/seed-media.mjs
 *
 * The URL defaults to this project; override with SUPABASE_URL if needed.
 * The service-role key is required (bucket writes bypass RLS). It is read
 * from the environment and never stored.
 */

import { createClient } from "@supabase/supabase-js";
import { deflateSync } from "node:zlib";

const DRY_RUN = process.argv.includes("--dry");

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://nnxdhexgwqnarlqxhpgt.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY && !DRY_RUN) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Find it in Dashboard > Project Settings > API > service_role, then:\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=xxxxx node scripts/seed-media.mjs"
  );
  process.exit(1);
}

const supabase = DRY_RUN
  ? null
  : createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

// ---------- deterministic PRNG ----------
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- minimal PNG encoder (RGBA) ----------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 8 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- cover art ----------
const CHARCOAL_TOP = [13, 13, 13];
const CHARCOAL_BOT = [26, 26, 26];
const LIME = [204, 255, 48];

// Per-category accent strength keeps a family look without text.
const KIND_INTENSITY = {
  goal: 0.26,
  program: 0.22,
  workout: 0.2,
  exercise: 0.16,
};

function generateCover(seed, kind, width = 1200, height = 800) {
  const rng = mulberry32(hash(seed));
  const rgba = Buffer.alloc(width * height * 4);

  const baseIntensity = KIND_INTENSITY[kind] ?? 0.2;
  // Primary glow
  const g1x = (0.15 + 0.7 * rng()) * width;
  const g1y = (0.1 + 0.55 * rng()) * height;
  const g1r = (0.55 + 0.4 * rng()) * height;
  const g1i = baseIntensity * (0.85 + 0.3 * rng());
  // Secondary, tighter glow
  const g2x = (0.15 + 0.7 * rng()) * width;
  const g2y = (0.35 + 0.55 * rng()) * height;
  const g2r = (0.25 + 0.2 * rng()) * height;
  const g2i = baseIntensity * 0.5 * rng();
  // Diagonal accent band
  const angle = rng() * Math.PI;
  const nx = Math.cos(angle);
  const ny = Math.sin(angle);
  const bandOffset = (0.2 + 0.6 * rng()) * (width + height);
  const bandWidth = 6 + 10 * rng();
  const bandIntensity = 0.1 + 0.12 * rng();

  for (let y = 0; y < height; y++) {
    const t = y / height;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      // vertical charcoal gradient
      let r = CHARCOAL_TOP[0] + (CHARCOAL_BOT[0] - CHARCOAL_TOP[0]) * t;
      let g = CHARCOAL_TOP[1] + (CHARCOAL_BOT[1] - CHARCOAL_TOP[1]) * t;
      let b = CHARCOAL_TOP[2] + (CHARCOAL_BOT[2] - CHARCOAL_TOP[2]) * t;

      // subtle edge vignette
      const vx = (x / width - 0.5) * 2;
      const vy = (y / height - 0.5) * 2;
      const vig = 1 - 0.25 * (vx * vx + vy * vy);
      r *= vig;
      g *= vig;
      b *= vig;

      // primary glow
      const d1 = Math.hypot(x - g1x, y - g1y) / g1r;
      const glow1 = Math.max(0, 1 - d1) ** 2 * g1i;
      // secondary glow
      const d2 = Math.hypot(x - g2x, y - g2y) / g2r;
      const glow2 = Math.max(0, 1 - d2) ** 2 * g2i;
      // diagonal band
      const dist = Math.abs(x * nx + y * ny - bandOffset);
      const band = Math.max(0, 1 - dist / bandWidth) * bandIntensity;

      const limeAmt = Math.min(0.75, glow1 + glow2 + band);
      r += (LIME[0] - r) * limeAmt;
      g += (LIME[1] - g) * limeAmt;
      b += (LIME[2] - b) * limeAmt;

      rgba[i] = Math.max(0, Math.min(255, r));
      rgba[i + 1] = Math.max(0, Math.min(255, g));
      rgba[i + 2] = Math.max(0, Math.min(255, b));
      rgba[i + 3] = 255;
    }
  }
  return encodePng(width, height, rgba);
}

// ---------- collect target paths from the database ----------
function kindFromPath(path) {
  if (path.includes("/goals/")) return "goal";
  if (path.includes("/programs/")) return "program";
  if (path.includes("/workouts/")) return "workout";
  return "exercise";
}

async function collectPaths() {
  const paths = new Map(); // path -> alt text
  const sources = [
    ["fitness_goals", "name", " goal cover"],
    ["programs", "name", " cover"],
    ["workout_templates", "name", " workout cover"],
    ["exercises", "name", " cover"],
  ];
  for (const [table, nameCol, suffix] of sources) {
    const { data, error } = await supabase
      .from(table)
      .select(`${nameCol}, cover_image_path`)
      .not("cover_image_path", "is", null);
    if (error) throw new Error(`${table}: ${error.message}`);
    for (const row of data) {
      paths.set(row.cover_image_path, `${row[nameCol]}${suffix}`);
    }
  }
  return paths;
}

async function dryRun() {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const out = process.env.DRY_OUT || "/tmp/stellio-covers";
  mkdirSync(out, { recursive: true });
  const samples = [
    ["covers/goals/beginner-strength.jpg", "goal"],
    ["covers/programs/bodybuilding-foundations.jpg", "program"],
    ["covers/workouts/push-day.jpg", "workout"],
    ["covers/exercises/goblet-squat.jpg", "exercise"],
    ["covers/exercises/face-pull.jpg", "exercise"],
  ];
  for (const [path, kind] of samples) {
    const png = generateCover(path, kind);
    const name = path.replace(/\//g, "_").replace(/\.jpg$/, ".png");
    writeFileSync(`${out}/${name}`, png);
    console.log(`  ${name}  (${png.length} bytes)`);
  }
  console.log(`Dry run wrote ${samples.length} covers to ${out}`);
}

async function main() {
  if (DRY_RUN) return dryRun();
  console.log(`Seeding media into ${SUPABASE_URL} ...`);
  const paths = await collectPaths();
  console.log(`Found ${paths.size} cover paths to generate.`);

  let done = 0;
  for (const [path, alt] of paths) {
    const png = generateCover(path, kindFromPath(path));
    const { error: upErr } = await supabase.storage
      .from("media")
      .upload(path, png, { contentType: "image/png", upsert: true });
    if (upErr) {
      console.error(`  ✗ ${path}: ${upErr.message}`);
      continue;
    }
    const { error: dbErr } = await supabase.from("media_assets").upsert(
      {
        storage_bucket: "media",
        storage_path: path,
        media_type: "image",
        alt_text: alt,
        status: "published",
        width: 1200,
        height: 800,
      },
      { onConflict: "storage_bucket,storage_path" }
    );
    if (dbErr) console.error(`  ! ${path} media_assets: ${dbErr.message}`);
    done++;
    if (done % 10 === 0) console.log(`  ...${done}/${paths.size}`);
  }

  console.log(`\nDone. Uploaded ${done}/${paths.size} covers to the media bucket.`);
  console.log("Cover images now render across the app.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
