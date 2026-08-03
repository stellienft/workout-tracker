/**
 * Client-only canvas rendering for branded, shareable achievement cards
 * (1080×1350, Instagram-story friendly). Mirrors the weight-progress card so
 * everything shared from Stellio Fit looks like one brand.
 */

const LIME = "#CCFF30";
const CHARCOAL_TOP = "#0D0D0D";
const CHARCOAL_BOT = "#161616";

const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

import type { AchIcon } from "@/lib/achievements";

export interface ShareCard {
  icon: AchIcon;
  kicker: string; // e.g. "PERSONAL RECORD"
  title: string;
  subtitle: string;
  footnote?: string; // e.g. "24 Jul 2026"
}

// Lucide icon inner markup (v0.487) — matches the icons used on the
// Achievements page so the shared card carries the same visual language.
const ICON_SVG: Record<AchIcon, string> = {
  flame:
    '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  medal:
    '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>',
  dumbbell:
    '<path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/>',
  repeat:
    '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  layers:
    '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
  scale:
    '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  footprints:
    '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>',
  timer:
    '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
  trophy:
    '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
};

/** Parse a CSS colour (#hex or rgb()) to [r,g,b]; falls back to lime. */
function toRgb(c: string): [number, number, number] {
  const str = c.trim();
  if (str.startsWith("#")) {
    const h = str.slice(1);
    const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = str.match(/\d+/g);
  if (m && m.length >= 3) return [Number(m[0]), Number(m[1]), Number(m[2])];
  return [204, 255, 48];
}

/** Rasterise a Lucide icon (24×24 viewBox) into an Image at the given pixel size. */
function loadIcon(icon: AchIcon, color: string, px: number): Promise<HTMLImageElement | null> {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" ` +
    `fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" ` +
    `stroke-linejoin="round">${ICON_SVG[icon]}</svg>`;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Render a branded achievement card and return it as a PNG blob. */
export async function drawAchievementCard(card: ShareCard): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Use the member's current theme accent so shared cards match their app.
  const accent =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--accent-primary")
      .trim() || LIME;
  const [ar, ag, ab] = toRgb(accent);
  const argba = (a: number) => `rgba(${ar},${ag},${ab},${a})`;

  // Background + glow.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, CHARCOAL_TOP);
  bg.addColorStop(1, CHARCOAL_BOT);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 520, 0, W / 2, 520, 620);
  glow.addColorStop(0, argba(0.18));
  glow.addColorStop(1, argba(0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Wordmark.
  ctx.font = `800 46px ${SANS}`;
  const s = "Stellio ";
  const f = "Fit";
  const sw = ctx.measureText(s).width;
  const fw = ctx.measureText(f).width;
  const startX = W / 2 - (sw + fw) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(s, startX, 140);
  ctx.fillStyle = accent;
  ctx.fillText(f, startX + sw, 140);
  ctx.textAlign = "center";

  // Kicker.
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `700 30px ${SANS}`;
  ctx.fillText(card.kicker.toUpperCase(), W / 2, 210);

  // Icon medallion.
  const cx = W / 2;
  const cy = 470;
  ctx.beginPath();
  ctx.arc(cx, cy, 170, 0, Math.PI * 2);
  ctx.fillStyle = argba(0.12);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = argba(0.55);
  ctx.stroke();
  // Centred Lucide icon in place of an emoji.
  const iconPx = 168;
  const icon = await loadIcon(card.icon, accent, iconPx);
  if (icon) ctx.drawImage(icon, cx - iconPx / 2, cy - iconPx / 2, iconPx, iconPx);

  // Title (wrapped).
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 84px ${SANS}`;
  const titleLines = wrapLines(ctx, card.title, W - 160).slice(0, 3);
  let y = 760;
  for (const line of titleLines) {
    ctx.fillText(line, W / 2, y);
    y += 96;
  }

  // Subtitle (wrapped).
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `500 40px ${SANS}`;
  const subLines = wrapLines(ctx, card.subtitle, W - 200).slice(0, 3);
  y += 20;
  for (const line of subLines) {
    ctx.fillText(line, W / 2, y);
    y += 54;
  }

  if (card.footnote) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `600 32px ${SANS}`;
    ctx.fillText(card.footnote, W / 2, H - 230);
  }

  // Footer.
  ctx.fillStyle = accent;
  ctx.font = `800 40px ${SANS}`;
  ctx.fillText("Train Smarter. Build Stronger.", W / 2, H - 120);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `600 32px ${SANS}`;
  ctx.fillText("stellio.fit", W / 2, H - 70);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.95));
}

/** Share the image via the Web Share API, or download it as a fallback. */
export async function shareOrDownload(
  blob: Blob,
  filename: string
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
  // Share ONLY the file — no title/text. Some targets (e.g. WhatsApp on iOS)
  // attach the image AND the title, sending it twice.
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    await nav.share({ files: [file] });
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
