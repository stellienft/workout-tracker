"use client";

import { useMemo, useState } from "react";
import { Share2, Download } from "lucide-react";

interface Point {
  x: string; // ISO date (YYYY-MM-DD)
  y: number; // kg
}

const LIME = "#CCFF30";
const CHARCOAL_TOP = "#0D0D0D";
const CHARCOAL_BOT = "#161616";
const DAY = 86_400_000;

const RANGES = [
  { key: "1m", label: "1 month", days: 30 },
  { key: "3m", label: "3 months", days: 90 },
  { key: "6m", label: "6 months", days: 180 },
  { key: "all", label: "All time", days: null },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

function dayMs(iso: string): number {
  // Date-only strings parse as UTC midnight — consistent for positioning.
  return new Date(iso).getTime();
}

export function WeightProgress({
  data,
  tz = "Australia/Brisbane",
}: {
  data: Point[];
  tz?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("all");

  const hasData = data.length > 0;

  // "Today" in the member's timezone, as a UTC-midnight day value.
  const todayMs = useMemo(() => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()); // en-CA => YYYY-MM-DD
    return dayMs(today);
  }, [tz]);

  // Window [startMs, endMs] for the selected range, always ending today.
  const { startMs, endMs, visible } = useMemo(() => {
    const firstMs = hasData ? dayMs(data[0].x) : todayMs;
    const lastMs = hasData ? dayMs(data[data.length - 1].x) : todayMs;
    const end = Math.max(todayMs, lastMs);
    const r = RANGES.find((x) => x.key === range)!;
    const windowDays =
      r.days ?? Math.max(Math.ceil((end - firstMs) / DAY), 14);
    const start = end - windowDays * DAY;
    const vis = data.filter((d) => {
      const m = dayMs(d.x);
      return m >= start && m <= end;
    });
    return { startMs: start, endMs: end, visible: vis };
  }, [data, hasData, range, todayMs]);

  const firstVisible = visible[0] ?? null;
  const lastVisible = visible[visible.length - 1] ?? null;
  const current = lastVisible?.y ?? null;
  const totalChange =
    firstVisible && lastVisible ? lastVisible.y - firstVisible.y : null;
  const weeks =
    firstVisible && lastVisible
      ? Math.max((dayMs(lastVisible.x) - dayMs(firstVisible.x)) / (7 * DAY), 0)
      : 0;
  const weeklyAvg =
    totalChange != null && weeks > 0 ? totalChange / weeks : null;
  const percent =
    totalChange != null && firstVisible && firstVisible.y !== 0
      ? (totalChange / firstVisible.y) * 100
      : null;

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
      const chg = (data[data.length - 1].y ?? 0) - (data[0].y ?? 0);
      const text =
        chg < 0
          ? `Down ${Math.abs(chg).toFixed(1)} kg with Stellio Fit 💪 Train Smarter. Build Stronger.`
          : `Tracking my progress with Stellio Fit 💪 ${current?.toFixed(1)} kg and counting.`;
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
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Body weight</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">
              {current != null ? `${current} kg` : "—"}
            </span>
          </div>
        </div>
        <button
          onClick={share}
          disabled={busy || !hasData || data.length < 2}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-3.5 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" /> {busy ? "…" : "Share"}
        </button>
      </div>

      {/* Range selector */}
      <div className="mx-5 mb-3 grid grid-cols-4 gap-1 rounded-full bg-[var(--surface-secondary)] p-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-full py-1.5 text-xs font-semibold transition-colors ${
              range === r.key
                ? "bg-[var(--accent-primary)] text-black"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Stat tiles */}
      <div className="mx-5 mb-1 grid grid-cols-3 gap-2">
        <Tile
          label="Total change"
          value={totalChange != null ? `${signed(totalChange)} kg` : "—"}
          good={totalChange != null && totalChange < 0}
        />
        <Tile
          label="Weekly avg"
          value={weeklyAvg != null ? `${signed(weeklyAvg)} kg` : "—"}
          good={weeklyAvg != null && weeklyAvg < 0}
        />
        <Tile
          label="Percent"
          value={percent != null ? `${signed(percent, 0)}%` : "—"}
          good={percent != null && percent < 0}
        />
      </div>

      <div className="p-5 pt-2">
        {hasData ? (
          <WeightChart
            points={visible}
            startMs={startMs}
            endMs={endMs}
            single={data.length < 2}
          />
        ) : (
          <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-sm text-[var(--text-muted)]">
            <p>No weigh-ins yet.</p>
            <p>Log your weight below to start your progress graph.</p>
          </div>
        )}
        {data.length === 1 && (
          <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
            One weigh-in so far — log again to draw your trend line.
          </p>
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

function Tile({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3">
      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
      <p
        className={`mt-0.5 text-lg font-bold ${
          good ? "text-[var(--accent-primary)]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/** Date-positioned line chart: X = time (start→end), Y = kg (labels on right). */
function WeightChart({
  points,
  startMs,
  endMs,
  single,
}: {
  points: Point[];
  startMs: number;
  endMs: number;
  single: boolean;
}) {
  const width = 600;
  const height = 240;
  const m = { top: 12, right: 46, bottom: 28, left: 12 };
  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;
  const span = Math.max(endMs - startMs, DAY);

  const ys = points.map((p) => p.y);
  const rawMin = ys.length ? Math.min(...ys) : 0;
  const rawMax = ys.length ? Math.max(...ys) : 1;
  const pad = ys.length && rawMax !== rawMin ? (rawMax - rawMin) * 0.15 : 3;
  const min = rawMin - pad;
  const max = rawMax + pad;
  const range = max - min || 1;

  const xFor = (ms: number) => m.left + ((ms - startMs) / span) * plotW;
  const yFor = (v: number) => m.top + (1 - (v - min) / range) * plotH;

  const coords = points.map((p) => [xFor(dayMs(p.x)), yFor(p.y)] as const);

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`)
    .join(" ");
  const area = coords.length
    ? `M ${coords[0][0].toFixed(1)} ${m.top + plotH} ` +
      coords.map((c) => `L ${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(" ") +
      ` L ${coords[coords.length - 1][0].toFixed(1)} ${m.top + plotH} Z`
    : "";

  const yTicks = Array.from({ length: 4 }, (_, i) => min + (range / 3) * i);
  const spansYear =
    new Date(startMs).getUTCFullYear() !== new Date(endMs).getUTCFullYear();
  const xTicks = Array.from({ length: 5 }, (_, i) => {
    const ms = startMs + (span / 4) * i;
    return { ms, x: xFor(ms), label: formatDay(ms, spansYear) };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Body weight over time"
    >
      <defs>
        <linearGradient id="wArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={LIME} stopOpacity="0.28" />
          <stop offset="100%" stopColor={LIME} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* horizontal gridlines + right-side kg labels */}
      {yTicks.map((v, i) => {
        const y = yFor(v);
        return (
          <g key={`y${i}`}>
            <line
              x1={m.left}
              y1={y}
              x2={m.left + plotW}
              y2={y}
              stroke="var(--border-subtle)"
              strokeWidth="1"
              opacity="0.5"
            />
            <text
              x={m.left + plotW + 6}
              y={y + 3.5}
              className="fill-[var(--text-muted)]"
              style={{ fontSize: "11px" }}
            >
              {Math.round(v)}kg
            </text>
          </g>
        );
      })}

      {/* vertical dashed date gridlines + labels */}
      {xTicks.map((t, i) => (
        <g key={`x${i}`}>
          <line
            x1={t.x}
            y1={m.top}
            x2={t.x}
            y2={m.top + plotH}
            stroke="var(--border-subtle)"
            strokeWidth="1"
            strokeDasharray="3 4"
            opacity="0.6"
          />
          <text
            x={t.x}
            y={m.top + plotH + 17}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            className="fill-[var(--text-muted)]"
            style={{ fontSize: "11px" }}
          >
            {t.label}
          </text>
        </g>
      ))}

      {area && <path d={area} fill="url(#wArea)" />}
      {line && (
        <path
          d={line}
          fill="none"
          stroke={LIME}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {coords.map((c, i) => (
        <circle key={i} cx={c[0]} cy={c[1]} r={single ? 4 : 2.6} fill={LIME} />
      ))}
    </svg>
  );
}

function signed(n: number, digits = 1) {
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;
}

function formatDay(ms: number, withYear: boolean) {
  return new Date(ms).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...(withYear ? { year: "2-digit" } : {}),
  });
}

function formatMonth(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
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

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, CHARCOAL_TOP);
  bg.addColorStop(1, CHARCOAL_BOT);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.85, H * 0.12, 0, W * 0.85, H * 0.12, 520);
  glow.addColorStop(0, "rgba(204,255,48,0.16)");
  glow.addColorStop(1, "rgba(204,255,48,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const pad = 80;
  const sans =
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  ctx.textBaseline = "alphabetic";
  ctx.font = `800 46px ${sans}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("Stellio ", pad, 130);
  const w1 = ctx.measureText("Stellio ").width;
  ctx.fillStyle = LIME;
  ctx.fillText("Fit", pad + w1, 130);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `600 30px ${sans}`;
  ctx.fillText("WEIGHT PROGRESS", pad, 230);

  const first = data[0].y;
  const last = data[data.length - 1].y;
  const change = last - first;

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 150px ${sans}`;
  ctx.fillText(`${last}`, pad, 400);
  const lw = ctx.measureText(`${last}`).width;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `700 56px ${sans}`;
  ctx.fillText("kg", pad + lw + 20, 400);

  const chipText =
    change < 0
      ? `▼ ${Math.abs(change).toFixed(1)} kg since ${formatMonth(data[0].x)}`
      : change > 0
        ? `▲ ${change.toFixed(1)} kg since ${formatMonth(data[0].x)}`
        : `Holding steady since ${formatMonth(data[0].x)}`;
  ctx.font = `700 34px ${sans}`;
  ctx.fillStyle = change < 0 ? LIME : "rgba(255,255,255,0.7)";
  ctx.fillText(chipText, pad, 470);

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

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 2;
  for (let g = 0; g <= 4; g++) {
    const gy = cy + (ch / 4) * g;
    ctx.beginPath();
    ctx.moveTo(cx, gy);
    ctx.lineTo(cx + cw, gy);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(px(0), cy + ch);
  data.forEach((d, i) => ctx.lineTo(px(i), py(d.y)));
  ctx.lineTo(px(data.length - 1), cy + ch);
  ctx.closePath();
  const areaGrad = ctx.createLinearGradient(0, cy, 0, cy + ch);
  areaGrad.addColorStop(0, "rgba(204,255,48,0.35)");
  areaGrad.addColorStop(1, "rgba(204,255,48,0)");
  ctx.fillStyle = areaGrad;
  ctx.fill();

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

  ctx.beginPath();
  ctx.arc(px(data.length - 1), py(last), 12, 0, Math.PI * 2);
  ctx.fillStyle = LIME;
  ctx.fill();

  ctx.font = `600 26px ${sans}`;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText(`${max} kg`, cx, cy - 14);
  ctx.fillText(`${min} kg`, cx, cy + ch + 40);

  ctx.textAlign = "right";
  ctx.fillText(formatMonth(data[data.length - 1].x), cx + cw, cy + ch + 40);
  ctx.textAlign = "left";

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
