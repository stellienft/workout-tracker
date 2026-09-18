"use client";

/**
 * Wake-word listening loop over the Web Speech API.
 *
 * Chrome on Android is the target (that's what an AliExpress tablet runs), and
 * it imposes the shape of this controller:
 *  - `continuous` is honoured unevenly and recognition ends on its own after a
 *    pause, so the loop restarts itself on every `end` while it is armed.
 *  - Recognition and synthesis fight: if the hub listens while it speaks it
 *    hears itself and loops. So the controller is hard-muted around replies.
 *  - Recognition is server-backed, so a flaky network shows up as `network`
 *    errors; those get an exponential backoff rather than a hot restart loop.
 *
 * No React in here — the controller is a plain object the hub component drives,
 * which keeps the restart logic out of the render cycle where StrictMode double
 * effects would tear it down mid-utterance.
 */

import { matchesWake, stripWake } from "@/lib/hub/intents";

export type VoiceState =
  | "off" // not listening at all
  | "wake" // idle, waiting for the wake word
  | "command" // woken, capturing the command
  | "busy" // muted while the hub thinks or speaks
  | "error";

export type VoiceErrorCode = "unsupported" | "denied" | "network" | "unknown";

export interface VoiceCallbacks {
  onState?: (state: VoiceState) => void;
  /** Live transcript while the user is talking (command mode only). */
  onPartial?: (text: string) => void;
  /** A complete command, wake word already stripped. */
  onCommand?: (text: string) => void;
  onWake?: () => void;
  onError?: (code: VoiceErrorCode, message: string) => void;
}

export interface VoiceConfig {
  wakeWord: string;
  /** False = push-to-talk only; the loop never arms itself. */
  wakeEnabled: boolean;
  lang?: string;
}

// Minimal typings: SpeechRecognition is not in the standard DOM lib.
interface SpeechRecognitionAlternativeLike { transcript: string; confidence: number }
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}
interface SpeechRecognitionErrorEventLike { error: string; message?: string }
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return recognitionCtor() !== null;
}

/** How long to keep capturing after the wake word before giving up. */
const COMMAND_TIMEOUT_MS = 7000;
/** Restart delay after a clean end, long enough not to thrash the recogniser. */
const RESTART_MS = 250;
const MAX_BACKOFF_MS = 30_000;

export class VoiceController {
  private recognition: SpeechRecognitionLike | null = null;
  private config: VoiceConfig;
  private callbacks: VoiceCallbacks;

  /** Whether the loop should be running at all (set by start/stop). */
  private armed = false;
  /** Hard mute — set while the hub speaks so it cannot hear itself. */
  private muted = false;
  private state: VoiceState = "off";
  private mode: "wake" | "command" = "wake";
  private backoff = RESTART_MS;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private commandTimer: ReturnType<typeof setTimeout> | null = null;
  private starting = false;

  constructor(config: VoiceConfig, callbacks: VoiceCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  getState(): VoiceState {
    return this.state;
  }

  updateConfig(config: Partial<VoiceConfig>) {
    this.config = { ...this.config, ...config };
  }

  private setState(next: VoiceState) {
    if (this.state === next) return;
    this.state = next;
    this.callbacks.onState?.(next);
  }

  /** Arm the loop. Safe to call repeatedly. */
  start() {
    if (!speechSupported()) {
      this.setState("error");
      this.callbacks.onError?.(
        "unsupported",
        "This browser can't listen. Use Chrome on Android, or tap the mic to type."
      );
      return;
    }
    this.armed = true;
    this.mode = "wake";
    this.launch();
  }

  /** Disarm completely (settings closed, hub backgrounded). */
  stop() {
    this.armed = false;
    this.clearTimers();
    this.teardown();
    this.setState("off");
  }

  /**
   * Skip the wake word — used by the push-to-talk button, which is also the
   * fallback when the wake loop can't run (no mic permission, older browser).
   */
  listenNow() {
    if (!speechSupported()) {
      this.callbacks.onError?.("unsupported", "This browser can't listen.");
      return;
    }
    this.armed = true;
    this.muted = false;
    this.mode = "command";
    this.teardown();
    this.launch();
    this.armCommandTimeout();
    this.callbacks.onWake?.();
  }

  /**
   * Mute while the hub is thinking or speaking. The recogniser is torn down
   * rather than paused: a paused recogniser on Android still picks up the
   * synthesised reply and re-triggers the wake word.
   */
  setMuted(muted: boolean) {
    if (this.muted === muted) return;
    this.muted = muted;
    if (muted) {
      this.clearTimers();
      this.teardown();
      this.setState("busy");
    } else if (this.armed) {
      this.mode = "wake";
      // Small gap so the tail of the reply isn't captured as a command.
      this.scheduleRestart(400);
    }
  }

  private clearTimers() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.commandTimer) {
      clearTimeout(this.commandTimer);
      this.commandTimer = null;
    }
  }

  private teardown() {
    const recognition = this.recognition;
    this.recognition = null;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.onstart = null;
    try {
      recognition.abort();
    } catch {
      // already stopped
    }
  }

  private scheduleRestart(delay: number) {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      this.launch();
    }, delay);
  }

  private launch() {
    if (!this.armed || this.muted || this.starting || this.recognition) return;
    const Ctor = recognitionCtor();
    if (!Ctor) return;

    // Push-to-talk works even when the wake loop is switched off.
    if (!this.config.wakeEnabled && this.mode === "wake") {
      this.setState("off");
      return;
    }

    this.starting = true;
    let recognition: SpeechRecognitionLike;
    try {
      recognition = new Ctor();
    } catch {
      this.starting = false;
      return;
    }

    recognition.lang = this.config.lang ?? "en-AU";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      this.starting = false;
      this.backoff = RESTART_MS;
      this.setState(this.mode === "command" ? "command" : "wake");
    };

    recognition.onresult = (event) => this.handleResult(event);

    recognition.onerror = (event) => {
      this.starting = false;
      const code = event.error;
      if (code === "no-speech" || code === "aborted") return; // normal; onend restarts
      if (code === "not-allowed" || code === "service-not-allowed") {
        this.armed = false;
        this.setState("error");
        this.callbacks.onError?.(
          "denied",
          "Microphone access is blocked. Allow it for this site in Chrome's site settings."
        );
        return;
      }
      if (code === "network") {
        // Speech recognition is server-backed; back off instead of hammering.
        this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
        this.callbacks.onError?.("network", "Lost the connection to speech recognition. Retrying.");
        return;
      }
      this.callbacks.onError?.("unknown", `Speech recognition error: ${code}`);
    };

    recognition.onend = () => {
      this.starting = false;
      this.recognition = null;
      if (!this.armed || this.muted) return;
      // Recognition ends on its own constantly on Android — this is the loop
      // that makes always-on listening possible at all.
      this.scheduleRestart(this.backoff);
    };

    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      // InvalidStateError: a previous instance hadn't finished tearing down.
      this.starting = false;
      this.recognition = null;
      this.scheduleRestart(500);
    }
  }

  private armCommandTimeout() {
    if (this.commandTimer) clearTimeout(this.commandTimer);
    this.commandTimer = setTimeout(() => {
      this.commandTimer = null;
      if (this.mode !== "command") return;
      // Heard the wake word but nothing followed — go back to waiting.
      this.mode = "wake";
      this.setState("wake");
      this.teardown();
      this.scheduleRestart(RESTART_MS);
    }, COMMAND_TIMEOUT_MS);
  }

  private handleResult(event: SpeechRecognitionEventLike) {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript ?? "";
      if (result.isFinal) final += text;
      else interim += text;
    }

    if (this.mode === "wake") {
      const heard = `${final} ${interim}`.trim();
      if (!heard || !matchesWake(heard, this.config.wakeWord)) return;

      const remainder = stripWake(heard, this.config.wakeWord);
      this.mode = "command";
      this.setState("command");
      this.callbacks.onWake?.();

      // "Hey Stellio, set an alarm for 6" — the command came in the same breath.
      if (final && remainder.length > 2) {
        this.dispatch(remainder);
        return;
      }
      this.armCommandTimeout();
      if (remainder) this.callbacks.onPartial?.(remainder);
      return;
    }

    // Command mode.
    if (interim) this.callbacks.onPartial?.(stripWake(interim, this.config.wakeWord));
    if (!final.trim()) return;

    const command = stripWake(final, this.config.wakeWord);
    if (!command) {
      this.armCommandTimeout();
      return;
    }
    this.dispatch(command);
  }

  private dispatch(command: string) {
    if (this.commandTimer) {
      clearTimeout(this.commandTimer);
      this.commandTimer = null;
    }
    this.mode = "wake";
    this.callbacks.onCommand?.(command);
  }
}
