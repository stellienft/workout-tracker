"use client";

import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import type { VoiceState } from "@/lib/hub/speech";

export interface Exchange {
  id: string;
  you: string;
  hub: string;
}

const LABEL: Record<VoiceState, string> = {
  off: "Tap to talk",
  wake: "Listening for the wake word",
  command: "Go ahead…",
  busy: "…",
  error: "Voice unavailable",
};

/**
 * The listening indicator and push-to-talk control.
 *
 * The orb is the whole status display: colour and motion say whether the hub is
 * dormant, woken, or replying, so the state is readable from across the room
 * without reading any text.
 */
export function VoiceBar({
  state,
  partial,
  speaking,
  lastExchange,
  error,
  onPushToTalk,
}: {
  state: VoiceState;
  partial: string;
  speaking: boolean;
  lastExchange: Exchange | null;
  error: string | null;
  onPushToTalk: () => void;
}) {
  const active = state === "command";
  const listening = state === "wake";

  return (
    <div className="flex flex-col gap-4">
      {/* Live transcript / last reply */}
      <div className="min-h-[5.5rem]">
        {partial ? (
          <p className="text-2xl sm:text-3xl font-medium text-[var(--text-primary)]">
            {partial}
            <span className="ml-1 inline-block h-6 w-[3px] animate-pulse bg-[var(--accent-primary)] align-middle" />
          </p>
        ) : lastExchange ? (
          <div className="space-y-1">
            <p className="text-base text-[var(--text-muted)]">“{lastExchange.you}”</p>
            <p className="text-xl sm:text-2xl font-medium text-[var(--text-primary)]">
              {lastExchange.hub}
            </p>
          </div>
        ) : (
          <p className="text-lg text-[var(--text-muted)]">
            {error ?? LABEL[state]}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onPushToTalk}
          aria-label="Talk to the hub"
          className={[
            "relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full transition-all duration-300",
            active
              ? "bg-[var(--accent-primary)] text-[var(--accent-ink)] scale-105"
              : state === "error"
                ? "bg-[var(--surface-secondary)] text-[var(--danger)]"
                : "bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]",
          ].join(" ")}
        >
          {/* Breathing ring: present while armed, energetic once woken. */}
          {(listening || active) && (
            <span
              className={`absolute inset-0 rounded-full border-2 ${
                active
                  ? "border-[var(--accent-primary)] animate-ping"
                  : "border-[var(--border-active)] animate-[pulse_3s_ease-in-out_infinite]"
              }`}
            />
          )}
          {state === "busy" ? (
            speaking ? (
              <Volume2 className="h-8 w-8" />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin" />
            )
          ) : state === "error" ? (
            <MicOff className="h-8 w-8" />
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </button>

        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {speaking ? "Speaking" : LABEL[state]}
          </p>
          {error && state === "error" ? (
            <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
