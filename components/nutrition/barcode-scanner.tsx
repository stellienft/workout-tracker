"use client";

import { useEffect, useRef, useState } from "react";
import { ScanLine, Keyboard } from "lucide-react";

/**
 * Camera barcode scanner. Uses ZXing (works on iOS Safari, unlike the native
 * BarcodeDetector) and always offers a manual-entry fallback for when the
 * camera is blocked or unavailable.
 */
export function BarcodeScanner({
  onDetected,
  busy,
}: {
  onDetected: (code: string) => void;
  busy?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const firedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        if (!videoRef.current || cancelled) return;
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result, _err, ctrl) => {
            if (result && !firedRef.current) {
              firedRef.current = true;
              ctrl.stop();
              onDetected(result.getText());
            }
          }
        );
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      } catch {
        setError("Camera unavailable — enter the barcode number instead.");
      }
    })();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // onDetected is stable enough for this one-shot scanner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      {!error && (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-black">
          <video
            ref={videoRef}
            className="aspect-[4/3] w-full object-cover"
            playsInline
            muted
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-4/5 rounded-xl border-2 border-[var(--accent-primary)]/80" />
          </div>
          <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            <ScanLine className="h-3.5 w-3.5" />
            {busy ? "Looking up…" : "Point at a barcode"}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-[var(--text-secondary)]">{error}</p>}

      {/* Manual fallback (always available) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const code = manual.replace(/\D/g, "");
          if (code.length >= 6) onDetected(code);
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Keyboard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="numeric"
            placeholder="Enter barcode number"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] pl-9 pr-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy || manual.replace(/\D/g, "").length < 6}
          className="h-11 shrink-0 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-40"
        >
          Look up
        </button>
      </form>
    </div>
  );
}
