"use client";

import { useEffect, useRef } from "react";

/**
 * A god-tier lightning-strike celebration on a full-screen canvas. Fires a few
 * staggered jagged bolts from the top of the screen with a bright flash and an
 * orange glow, then fades out. Dependency-free and respects reduced-motion.
 */
export function LightningStrike({
  durationMs = 1900,
  strikes = 3,
}: {
  durationMs?: number;
  strikes?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    const resize = () => {
      canvas.width = W() * dpr;
      canvas.height = H() * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // A jagged bolt from a top x to a target point, with a couple of branches.
    type Bolt = { start: number; points: [number, number][]; branches: [number, number][][] };
    const makeBolt = (startTime: number): Bolt => {
      const w = W();
      const h = H();
      const x0 = w * (0.25 + Math.random() * 0.5);
      const targetX = w * (0.4 + Math.random() * 0.2);
      const targetY = h * (0.5 + Math.random() * 0.18);
      const segs = 16;
      const points: [number, number][] = [];
      for (let i = 0; i <= segs; i++) {
        const p = i / segs;
        const x = x0 + (targetX - x0) * p + (Math.random() - 0.5) * 60 * (1 - p * 0.3);
        const y = (targetY / segs) * i;
        points.push([x, y]);
      }
      // 1–2 branches off a mid segment
      const branches: [number, number][][] = [];
      const nb = 1 + (Math.random() < 0.6 ? 1 : 0);
      for (let b = 0; b < nb; b++) {
        const idx = Math.floor(segs * (0.35 + Math.random() * 0.4));
        const [bx, by] = points[idx];
        const bsegs = 6;
        const dir = Math.random() < 0.5 ? -1 : 1;
        const bp: [number, number][] = [[bx, by]];
        for (let i = 1; i <= bsegs; i++) {
          bp.push([
            bx + dir * i * (14 + Math.random() * 20),
            by + i * (10 + Math.random() * 22),
          ]);
        }
        branches.push(bp);
      }
      return { start: startTime, points, branches };
    };

    const bolts: Bolt[] = Array.from({ length: strikes }, (_, i) =>
      makeBolt(i * (durationMs / (strikes + 1)) * 0.7)
    );

    const drawPath = (pts: [number, number][], lw: number, color: string, blur: number, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = "#FF7A29";
      ctx.shadowBlur = blur;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      ctx.restore();
    };

    let raf = 0;
    const start = performance.now();
    const BOLT_LIFE = 420;

    const frame = (t: number) => {
      const elapsed = t - start;
      const w = W();
      const h = H();
      ctx.clearRect(0, 0, w, h);

      // Global fade-out over the final 500ms.
      const globalFade = elapsed > durationMs - 500 ? Math.max(0, (durationMs - elapsed) / 500) : 1;

      for (const bolt of bolts) {
        const age = elapsed - bolt.start;
        if (age < 0 || age > BOLT_LIFE) continue;
        // Flicker: bright at strike, quick stutter, then decay.
        const life = 1 - age / BOLT_LIFE;
        const flicker = 0.55 + 0.45 * Math.abs(Math.sin(age * 0.06));
        const a = life * flicker * globalFade;

        // Screen flash from the top where the bolt enters.
        const flashA = Math.max(0, (1 - age / 180)) * 0.5 * globalFade;
        if (flashA > 0.01) {
          const g = ctx.createRadialGradient(bolt.points[0][0], 0, 0, bolt.points[0][0], h * 0.2, h);
          g.addColorStop(0, `rgba(255,180,120,${flashA})`);
          g.addColorStop(0.4, `rgba(255,82,14,${flashA * 0.35})`);
          g.addColorStop(1, "rgba(255,82,14,0)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }

        // Outer orange glow, then bright white core.
        drawPath(bolt.points, 7, "#FF520E", 26, a * 0.6);
        drawPath(bolt.points, 2.4, "#FFFFFF", 12, a);
        for (const br of bolt.branches) {
          drawPath(br, 4, "#FF520E", 18, a * 0.5);
          drawPath(br, 1.5, "#FFF3E6", 8, a * 0.85);
        }
      }

      if (elapsed < durationMs) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [durationMs, strikes]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[200] h-screen w-screen"
    />
  );
}
