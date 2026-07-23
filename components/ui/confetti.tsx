"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight, dependency-free confetti burst on a full-screen canvas. Runs
 * once on mount for `durationMs`, then clears itself. Respects reduced-motion.
 */
export function Confetti({
  durationMs = 4200,
  pieces = 160,
}: {
  durationMs?: number;
  pieces?: number;
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

    const colors = ["#CCFF30", "#7CE7C6", "#FF8A8A", "#FFD84D", "#8EA2FF", "#FFFFFF"];
    type Piece = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      rot: number;
      vr: number;
      size: number;
      color: string;
      round: boolean;
    };
    const parts: Piece[] = Array.from({ length: pieces }, () => ({
      x: Math.random() * W(),
      y: -20 - Math.random() * H() * 0.5,
      vx: (Math.random() - 0.5) * 3.5,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      size: 6 + Math.random() * 7,
      color: colors[Math.floor(Math.random() * colors.length)],
      round: Math.random() < 0.5,
    }));

    let raf = 0;
    const start = performance.now();

    const frame = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, W(), H());
      const fade = elapsed > durationMs - 900 ? Math.max(0, (durationMs - elapsed) / 900) : 1;
      for (const p of parts) {
        p.vy += 0.05; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.globalAlpha = fade;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (elapsed < durationMs) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W(), H());
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [durationMs, pieces]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[200] h-screen w-screen"
    />
  );
}
