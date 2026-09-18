"use client";

/**
 * The alarm chime, synthesised with the Web Audio API.
 *
 * Deliberately not an audio file: the hub must ring reliably on a device that
 * may be offline, and a synthesised tone can't fail to load, can't be evicted
 * from the cache, and adds nothing to the bundle.
 *
 * A rising two-tone pattern repeats until stopped, ramping in volume over the
 * first few cycles so it wakes you without being a shock.
 */

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export interface AlarmSound {
  start: () => void;
  stop: () => void;
}

const PATTERN_MS = 1400;
const TONES = [880, 1174.66]; // A5 then D6

export function createAlarmSound(): AlarmSound {
  let context: AudioContext | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let cycles = 0;

  const beep = (frequency: number, startAt: number, gain: number) => {
    if (!context) return;
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    // Short attack/decay envelope — a square-edged tone clicks on cheap speakers.
    amp.gain.setValueAtTime(0.0001, startAt);
    amp.gain.exponentialRampToValueAtTime(gain, startAt + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.42);
    osc.connect(amp).connect(context.destination);
    osc.start(startAt);
    osc.stop(startAt + 0.45);
  };

  const cycle = () => {
    if (!context) return;
    // Ramp from quiet to full over roughly the first 20 seconds.
    const gain = Math.min(0.35, 0.06 + cycles * 0.02);
    cycles++;
    const now = context.currentTime;
    beep(TONES[0], now + 0.02, gain);
    beep(TONES[1], now + 0.5, gain);
  };

  return {
    start() {
      if (timer) return;
      const Ctor = audioContextCtor();
      if (!Ctor) return;
      try {
        context = new Ctor();
        // Autoplay policy: the context starts suspended until a gesture. The
        // hub unlocks audio on first tap, so this usually resolves instantly.
        void context.resume();
      } catch {
        return;
      }
      cycles = 0;
      cycle();
      timer = setInterval(cycle, PATTERN_MS);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (context) {
        const ctx = context;
        context = null;
        ctx.close().catch(() => {});
      }
    },
  };
}
