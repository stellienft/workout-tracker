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

export interface ShareCard {
  emoji: string;
  kicker: string; // e.g. "PERSONAL RECORD"
  title: string;
  subtitle: string;
  footnote?: string; // e.g. "24 Jul 2026"
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

  // Background + glow.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, CHARCOAL_TOP);
  bg.addColorStop(1, CHARCOAL_BOT);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 520, 0, W / 2, 520, 620);
  glow.addColorStop(0, "rgba(204,255,48,0.18)");
  glow.addColorStop(1, "rgba(204,255,48,0)");
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
  ctx.fillStyle = LIME;
  ctx.fillText(f, startX + sw, 140);
  ctx.textAlign = "center";

  // Kicker.
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `700 30px ${SANS}`;
  ctx.fillText(card.kicker.toUpperCase(), W / 2, 210);

  // Emoji medallion.
  const cx = W / 2;
  const cy = 470;
  ctx.beginPath();
  ctx.arc(cx, cy, 170, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(204,255,48,0.12)";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(204,255,48,0.55)";
  ctx.stroke();
  ctx.font = `160px ${SANS}`;
  ctx.textBaseline = "middle";
  ctx.fillText(card.emoji, cx, cy + 8);
  ctx.textBaseline = "alphabetic";

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
  ctx.fillStyle = LIME;
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
  filename: string,
  title: string
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
  // Share ONLY the file — a text/URL makes targets unfurl a second image.
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    await nav.share({ files: [file], title });
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
