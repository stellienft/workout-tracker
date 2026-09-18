"use client";

/**
 * Text-to-speech for the hub, over the Web Speech API's speechSynthesis.
 *
 * Android Chrome has three well-known quirks this module papers over:
 *  1. Voices load asynchronously — getVoices() is empty on first call until the
 *     `voiceschanged` event fires.
 *  2. Synthesis is blocked until the page has had a user gesture, so the hub
 *     "unlocks" it by speaking an empty utterance on the first tap.
 *  3. Long utterances stall after ~15s unless pause/resume is pumped.
 */

export interface SpeakOptions {
  voiceName?: string | null;
  rate?: number;
  pitch?: number;
  /** Cancel anything already speaking. Defaults to true. */
  interrupt?: boolean;
}

let unlocked = false;
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
let pump: ReturnType<typeof setInterval> | null = null;

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Resolve once the voice list is populated (or immediately if it already is). */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) return Promise.resolve([]);
  if (voicesPromise) return voicesPromise;

  voicesPromise = new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    // Some builds never fire the event; don't hang the first spoken reply.
    setTimeout(done, 1500);
  });
  return voicesPromise;
}

/**
 * Pick the best available voice. Prefers an exact name match, then a local
 * (on-device, so offline-capable) English voice, then any English voice.
 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  preferred?: string | null
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  if (preferred) {
    const exact = voices.find((v) => v.name === preferred);
    if (exact) return exact;
  }
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : voices;
  return pool.find((v) => v.localService) ?? pool[0];
}

/**
 * Must be called from a user-gesture handler once per page load, otherwise the
 * first real utterance is silently dropped on Android.
 */
export function unlockTts() {
  if (!ttsSupported() || unlocked) return;
  try {
    const u = new SpeechSynthesisUtterance("");
    u.volume = 0;
    window.speechSynthesis.speak(u);
    unlocked = true;
  } catch {
    // Non-fatal: the hub still works, it just may not speak until the next tap.
  }
  void loadVoices();
}

export function cancelSpeech() {
  if (!ttsSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
  if (pump) {
    clearInterval(pump);
    pump = null;
  }
}

/**
 * Speak a line and resolve when it finishes (or fails). Never rejects — a hub
 * that can't talk should still carry out the command.
 */
export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!ttsSupported() || !text.trim()) return;
  const { interrupt = true, rate = 1, pitch = 1, voiceName = null } = options;

  if (interrupt) cancelSpeech();
  const voices = await loadVoices();

  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (pump) {
        clearInterval(pump);
        pump = null;
      }
      resolve();
    };

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickVoice(voices, voiceName);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.rate = Math.max(0.5, Math.min(2, rate));
      utterance.pitch = Math.max(0, Math.min(2, pitch));
      utterance.onend = finish;
      utterance.onerror = finish;

      window.speechSynthesis.speak(utterance);

      // Quirk 3: keep the synth alive through longer replies.
      if (pump) clearInterval(pump);
      pump = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          finish();
          return;
        }
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }, 10_000);

      // Hard stop: ~180 wpm plus headroom, so a stuck utterance can't wedge the
      // voice loop (the hub refuses to listen while it believes it is talking).
      const estimate = Math.min(30_000, 2000 + (text.length / 12) * 1000);
      setTimeout(finish, estimate + 8000);
    } catch {
      finish();
    }
  });
}
