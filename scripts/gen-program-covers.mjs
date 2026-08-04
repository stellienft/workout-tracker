#!/usr/bin/env node
// Generate on-brand lime-on-charcoal program covers as local PNGs.
// Same generative art as scripts/seed-media.mjs, but writes to public/ —
// no network, no Supabase. Seeded by the storage-style slug so each cover is
// distinct yet part of the same visual family as the existing library.

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const SLUGS = [
  "ppl-6day", "upper-lower-4", "bro-split-5", "full-body-3", "five-by-five",
  "powerlifting-3", "deadlift-spec", "squat-spec", "bench-spec",
  "antagonist-supersets", "arm-blaster", "circuit-conditioning",
];

const OUT = process.argv[2] || "public/covers/programs";
const W = 1200, H = 800;

function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) { raw[y * stride] = 0; rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4); }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const CHARCOAL_TOP = [13, 13, 13], CHARCOAL_BOT = [26, 26, 26], LIME = [204, 255, 48];

function generateCover(seed) {
  const rng = mulberry32(hash(seed));
  const rgba = Buffer.alloc(W * H * 4);
  const baseIntensity = 0.22; // "program" intensity from seed-media
  const g1x = (0.15 + 0.7 * rng()) * W, g1y = (0.1 + 0.55 * rng()) * H, g1r = (0.55 + 0.4 * rng()) * H, g1i = baseIntensity * (0.85 + 0.3 * rng());
  const g2x = (0.15 + 0.7 * rng()) * W, g2y = (0.35 + 0.55 * rng()) * H, g2r = (0.25 + 0.2 * rng()) * H, g2i = baseIntensity * 0.5 * rng();
  const angle = rng() * Math.PI, nx = Math.cos(angle), ny = Math.sin(angle);
  const bandOffset = (0.2 + 0.6 * rng()) * (W + H), bandWidth = 6 + 10 * rng(), bandIntensity = 0.1 + 0.12 * rng();

  for (let y = 0; y < H; y++) {
    const t = y / H;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      let r = CHARCOAL_TOP[0] + (CHARCOAL_BOT[0] - CHARCOAL_TOP[0]) * t;
      let g = CHARCOAL_TOP[1] + (CHARCOAL_BOT[1] - CHARCOAL_TOP[1]) * t;
      let b = CHARCOAL_TOP[2] + (CHARCOAL_BOT[2] - CHARCOAL_TOP[2]) * t;
      const vx = (x / W - 0.5) * 2, vy = (y / H - 0.5) * 2, vig = 1 - 0.25 * (vx * vx + vy * vy);
      r *= vig; g *= vig; b *= vig;
      const d1 = Math.hypot(x - g1x, y - g1y) / g1r, glow1 = Math.max(0, 1 - d1) ** 2 * g1i;
      const d2 = Math.hypot(x - g2x, y - g2y) / g2r, glow2 = Math.max(0, 1 - d2) ** 2 * g2i;
      const dist = Math.abs(x * nx + y * ny - bandOffset), band = Math.max(0, 1 - dist / bandWidth) * bandIntensity;
      const limeAmt = Math.min(0.75, glow1 + glow2 + band);
      r += (LIME[0] - r) * limeAmt; g += (LIME[1] - g) * limeAmt; b += (LIME[2] - b) * limeAmt;
      rgba[i] = Math.max(0, Math.min(255, r)); rgba[i + 1] = Math.max(0, Math.min(255, g));
      rgba[i + 2] = Math.max(0, Math.min(255, b)); rgba[i + 3] = 255;
    }
  }
  return encodePng(W, H, rgba);
}

mkdirSync(OUT, { recursive: true });
let total = 0;
for (const slug of SLUGS) {
  const png = generateCover(`covers/programs/${slug}.jpg`);
  writeFileSync(`${OUT}/${slug}.png`, png);
  total += png.length;
  console.log(`  ${slug}.png  ${(png.length / 1024).toFixed(0)} KB`);
}
console.log(`\nWrote ${SLUGS.length} covers (${(total / 1024 / 1024).toFixed(2)} MB total) to ${OUT}`);
