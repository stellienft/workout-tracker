"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, Check, NotebookPen } from "lucide-react";
import { useToast } from "@/components/ui/toast";

// Minimal typings for the Web Speech API (not in the default DOM lib).
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Voice-to-text journal note for a workout session. Dictation uses the browser's
 * Web Speech API (on-device on iOS/Chrome, no upload); when that's unavailable
 * the box still works as a plain typed note (and the keyboard's own mic dictation
 * works too). Saves the transcript to the session's notes.
 */
export function VoiceNote({
  save,
  initialValue = "",
  title = "Session journal",
  hint,
  placeholder = "How did it feel? Energy, aches, PRs, what to change next time…",
}: {
  save: (text: string) => Promise<{ ok: boolean; error?: string }>;
  initialValue?: string;
  title?: string;
  hint?: string;
  placeholder?: string;
}) {
  const toast = useToast();
  const [text, setText] = useState(initialValue);
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [supported, setSupported] = useState(false);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef(initialValue); // committed transcript (finalised chunks)
  const wantListenRef = useRef(false); // user intends to keep dictating

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => {
      wantListenRef.current = false;
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function startListening() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-AU";
    rec.continuous = true;
    rec.interimResults = true;
    // Begin appending after whatever is already in the box.
    finalRef.current = text ? text.replace(/\s*$/, "") + " " : "";

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const chunk = res[0].transcript;
        if (res.isFinal) finalRef.current += chunk + " ";
        else interim += chunk;
      }
      setSaved(false);
      setText((finalRef.current + interim).replace(/\s+/g, " ").trimStart());
    };
    rec.onerror = (ev) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        wantListenRef.current = false;
        setListening(false);
        toast("Microphone access is blocked — enable it to dictate.", "error");
      }
      // 'no-speech' / 'aborted' are transient; onend handles restart.
    };
    rec.onend = () => {
      // iOS/Safari stops after a pause; restart while the user still wants to talk.
      if (wantListenRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through to stop */
        }
      }
      setListening(false);
    };

    recRef.current = rec;
    wantListenRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function stopListening() {
    wantListenRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }

  function toggle() {
    if (listening) stopListening();
    else startListening();
  }

  async function onSave() {
    if (listening) stopListening();
    setSaving(true);
    try {
      const res = await save(text);
      if (res.ok) {
        setSaved(true);
        toast("Note saved.", "success");
      } else {
        toast(res.error ?? "Couldn't save — try again.", "error");
      }
    } catch {
      toast("Couldn't save — try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  const dirty = text.trim() !== (initialValue ?? "").trim();

  return (
    <div className="w-full rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 text-left">
      <div className="flex items-center gap-2">
        <NotebookPen className="h-4 w-4 text-[var(--accent-primary)]" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {hint ??
          (supported
            ? "Leave a note about today — type it, or tap the mic to dictate."
            : "Leave a note about today. Tip: use your keyboard's mic to dictate.")}
      </p>

      <div className="relative mt-3">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            finalRef.current = e.target.value;
            setSaved(false);
          }}
          rows={4}
          placeholder={placeholder}
          className="w-full resize-y rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 pr-12 text-sm outline-none focus:border-[var(--accent-primary)]"
        />
        {supported && (
          <button
            type="button"
            onClick={toggle}
            aria-label={listening ? "Stop dictation" : "Start dictation"}
            aria-pressed={listening}
            className={`absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              listening
                ? "bg-[var(--danger,#e5484d)] text-white"
                : "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
            }`}
          >
            {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-[var(--text-muted)]">
          {listening ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--accent-primary)]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-primary)]" />
              Listening…
            </span>
          ) : saved ? (
            <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          ) : (
            ""
          )}
        </span>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || (!dirty && saved) || (!dirty && !text)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Save note"}
        </button>
      </div>
    </div>
  );
}
