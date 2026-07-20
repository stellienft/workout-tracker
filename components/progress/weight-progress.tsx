"use client";

import { useState } from "react";
import { LineChart } from "@/components/ui/line-chart";
import { Share2, TrendingDown, TrendingUp, Download } from "lucide-react";

interface Point {
  x: string; // ISO date
  y: number; // kg
}

const LIME = "#CCFF30";
const CHARCOAL_TOP = "#0D0D0D";
const CHARCOAL_BOT = "#161616";

export function WeightProgress({ data }: { data: Point[] }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const hasData = data.length > 0;
  const first = data[0]?.y ?? null;
  const last = data[data.length - 1]?.y ?? null;
  const change = first != null && last != null ? last - first : 0;
  const startLabel = data[0] ? formatMonth(data[0].x) : "";

  async function share() {
    if (!hasData) return;
    setBusy(true);
    setNote(null);
    try {
      const blob = await drawShareCard(data);
      if (!blob) throw new Error("Could not render image");
      const file = new File([blob], "stellio-fit-progress.png", {
        type: "image/png",
      });
      const text =
        change < 0
          ? `Down ${Math.abs(change).toFixed(1)} kg with Stellio Fit 💪 Train Smarter. Build Stronger.`
          : `Tracking my progress with Stellio Fit 💪 ${last?.toFixed(1)} kg and counting.`;
      const shareData: ShareData = {
        files: [file],
        title: "My Stellio Fit progress",
        text: `${text} https://stellio.fit`,
      };
      const nav = navigator as Navigator & {
        canShare?: (d?: ShareData) => boolean;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share(shareData);
      } else {
        downloadBlob(blob, "stellio-fit-progress.png");
        setNote("Image saved — share it to your socials.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setNote("Couldn't share — try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Body weight</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">
              {last != null ? `${last} kg` : "—"}
            </span>
            {hasData && data.length > 1 && (
              <span
                className={`inline-flex items-center gap-1 text-sm font-semibold ${
                  change < 0
                    ? "text-[var(--accent-primary)]"
                    : change > 0
                      ? "text-[var(--text-secondary)]"
                      : "text-[var(--text-muted)]"
                }`}
              >
                {change < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : change > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : null}
                {change > 0 ? "+" : ""}
                {change.toFixed(1)} kg
              </span>
            )}
          </div>
          {startLabel && (
            <p className="text-xs text-[var(--text-muted)]">since {startLabel}</p>
          )}
        </div>
        <button
          onClick={share}
          disabled={busy || !hasData || data.length < 2}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-3.5 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" /> {busy ? "…" : "Share"}
        </button>
      </div>

      <div className="p-5 pt-3">
        {hasData ? (
          <LineChart data={data} height={200} unit="kg" />
        ) : (
          <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-sm text-[var(--text-muted)]">
            <p>No weigh-ins yet.</p>
            <p>Log your weight below to start your progress graph.</p>
          </div>
        )}
        {note && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Download className="h-3.5 w-3.5" /> {note}
          </p>
        )}
      </div>
    </div>
  );
}

function formatMonth(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Draw a branded, shareable 1080×1350 progress card. */
async function drawShareCard(data: Point[]): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, CHARCOAL_TOP);
  bg.addColorStop(1, CHARCOAL_BOT);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft lime glow top-right
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.12, 0, W * 0.85, H * 0.12, 520);
  glow.addColorStop(0, "rgba(204,255,48,0.16)");
  glow.addColorStop(1, "rgba(204,255,48,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const pad = 80;
  const sans =
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  // Wordmark
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 46px ${sans}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("Stellio ", pad, 130);
  const w1 = ctx.measureText("Stellio ").width;
  ctx.fillStyle = LIME;
  ctx.fillText("Fit", pad + w1, 130);

  // Heading
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `600 30px ${sans}`;
  ctx.fillText("WEIGHT PROGRESS", pad, 230);

  const first = data[0].y;
  const last = data[data.length - 1].y;
  const change = last - first;

  // Big current weight
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 150px ${sans}`;
  ctx.fillText(`${last}`, pad, 400);
  const lw = ctx.measureText(`${last}`).width;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `700 56px ${sans}`;
  ctx.fillText("kg", pad + lw + 20, 400);

  // Change chip
  const chipText =
    change < 0
      ? `▼ ${Math.abs(change).toFixed(1)} kg since ${formatMonth(data[0].x)}`
      : change > 0
        ? `▲ ${change.toFixed(1)} kg since ${formatMonth(data[0].x)}`
        : `Holding steady since ${formatMonth(data[0].x)}`;
  ctx.font = `700 34px ${sans}`;
  ctx.fillStyle = change < 0 ? LIME : "rgba(255,255,255,0.7)";
  ctx.fillText(chipText, pad, 470);

  // Chart area
  const cx = pad;
  const cy = 560;
  const cw = W - pad * 2;
  const ch = 560;

  const ys = data.map((d) => d.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const range = max - min || 1;
  const px = (i: number) => cx + (i / Math.max(data.length - 1, 1)) * cw;
  const py = (y: number) => cy + (1 - (y - min) / range) * ch;

  // gridlines
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 2;
  for (let g = 0; g <= 4; g++) {
    const gy = cy + (ch / 4) * g;
    ctx.beginPath();
    ctx.moveTo(cx, gy);
    ctx.lineTo(cx + cw, gy);
    ctx.stroke();
  }

  // area fill
  ctx.beginPath();
  ctx.moveTo(px(0), cy + ch);
  data.forEach((d, i) => ctx.lineTo(px(i), py(d.y)));
  ctx.lineTo(px(data.length - 1), cy + ch);
  ctx.closePath();
  const area = ctx.createLinearGradient(0, cy, 0, cy + ch);
  area.addColorStop(0, "rgba(204,255,48,0.35)");
  area.addColorStop(1, "rgba(204,255,48,0)");
  ctx.fillStyle = area;
  ctx.fill();

  // line
  ctx.beginPath();
  data.forEach((d, i) => {
    const X = px(i);
    const Y = py(d.y);
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  });
  ctx.strokeStyle = LIME;
  ctx.lineWidth = 7;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  // endpoint dot
  ctx.beginPath();
  ctx.arc(px(data.length - 1), py(last), 12, 0, Math.PI * 2);
  ctx.fillStyle = LIME;
  ctx.fill();

  // min/max labels
  ctx.font = `600 26px ${sans}`;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText(`${max} kg`, cx, cy - 14);
  ctx.fillText(`${min} kg`, cx, cy + ch + 40);

  // date range
  ctx.textAlign = "right";
  ctx.fillText(formatMonth(data[data.length - 1].x), cx + cw, cy + ch + 40);
  ctx.textAlign = "left";

  // Footer
  ctx.fillStyle = LIME;
  ctx.font = `800 40px ${sans}`;
  ctx.fillText("Train Smarter. Build Stronger.", pad, H - 120);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `600 32px ${sans}`;
  ctx.fillText("stellio.fit", pad, H - 70);

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png", 0.95)
  );
}
