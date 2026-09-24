"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, Loader2, Check, NotebookPen, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

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

function canRecordAudio(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

function pickAudioMime(): { mime: string; ext: string } {
  const candidates: [string, string][] = [
    ["audio/mp4", "m4a"],
    ["audio/webm;codecs=opus", "webm"],
    ["audio/webm", "webm"],
  ];
  for (const [mime, ext] of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return { mime, ext };
    } catch {
      /* ignore */
    }
  }
  return { mime: "", ext: "webm" };
}

/**
 * Voice-to-text note. Dictation uses the browser's Web Speech API (on-device,
 * no upload); when unavailable the box still works as a typed note. In `audio`
 * mode the mic also records the voice memo, which is uploaded and attached on
 * save. `clearOnSave` makes it an append composer (each save is a fresh entry).
 */
export function VoiceNote({
  save,
  initialValue = "",
  title = "Session journal",
  hint,
  placeholder = "How did it feel? Energy, aches, PRs, what to change next time…",
  clearOnSave = false,
  audio = false,
  saveLabel = "Save note",
}: {
  save: (text: string, audioPath?: string | null) => Promise<{ ok: boolean; error?: string }>;
  initialValue?: string;
  title?: string;
  hint?: string;
  placeholder?: string;
  clearOnSave?: boolean;
  audio?: boolean;
  saveLabel?: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [text, setText] = useState(initialValue);
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [supported, setSupported] = useState(false);
  const [audioOk, setAudioOk] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null); // local preview

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef(initialValue);
  const wantListenRef = useRef(false);
  const restartsRef = useRef(0);
  const lastStartRef = useRef(0);

  // Audio recording refs.
  const mrRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const extRef = useRef<string>("webm");

  function teardown(rec: SpeechRecognitionLike | null) {
    if (!rec) return;
    rec.onend = null;
    rec.onresult = null;
    rec.onerror = null;
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function clearAudio() {
    blobRef.current = null;
    chunksRef.current = [];
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    setAudioOk(audio && canRecordAudio());
    return () => {
      wantListenRef.current = false;
      teardown(recRef.current);
      try {
        mrRef.current?.stop();
      } catch {
        /* ignore */
      }
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    if (!audio || !canRecordAudio()) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mime, ext } = pickAudioMime();
      extRef.current = ext;
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const type = mr.mimeType || (mime || "audio/webm");
        const blob = new Blob(chunksRef.current, { type });
        blobRef.current = blob.size > 0 ? blob : null;
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return blobRef.current ? URL.createObjectURL(blobRef.current) : null;
        });
        stopStream();
      };
      mrRef.current = mr;
      mr.start();
    } catch {
      // Audio unavailable (permission/hardware) — carry on text-only.
      stopStream();
    }
  }

  function stopRecording() {
    try {
      if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
    } catch {
      stopStream();
    }
  }

  function startListening() {
    // Replacing any previous recording for this entry.
    if (audioOk) clearAudio();

    const Ctor = getRecognitionCtor();
    if (Ctor) {
      const rec = new Ctor();
      rec.lang = "en-AU";
      rec.continuous = true;
      rec.interimResults = true;
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
        const fatal =
          ev.error === "not-allowed" ||
          ev.error === "service-not-allowed" ||
          ev.error === "audio-capture";
        if (fatal) {
          wantListenRef.current = false;
          teardown(rec);
          if (!audioOk) setListening(false);
          toast(
            ev.error === "audio-capture"
              ? "No microphone found."
              : "Microphone access is blocked — enable it to dictate.",
            "error"
          );
        }
      };
      rec.onend = () => {
        if (!wantListenRef.current) return;
        const now = Date.now();
        restartsRef.current = now - lastStartRef.current < 1200 ? restartsRef.current + 1 : 0;
        if (restartsRef.current >= 3) {
          wantListenRef.current = false;
          return;
        }
        lastStartRef.current = now;
        try {
          rec.start();
        } catch {
          wantListenRef.current = false;
        }
      };

      recRef.current = rec;
      wantListenRef.current = true;
      restartsRef.current = 0;
      lastStartRef.current = Date.now();
      try {
        rec.start();
      } catch {
        wantListenRef.current = false;
      }
    }

    // Capture the audio memo alongside the transcript (best-effort).
    void startRecording();
    setListening(true);
  }

  function stopListening() {
    wantListenRef.current = false;
    teardown(recRef.current);
    stopRecording();
    setListening(false);
  }

  function toggle() {
    if (listening) stopListening();
    else startListening();
  }

  async function uploadAudio(): Promise<string | null> {
    const blob = blobRef.current;
    if (!blob) return null;
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const uid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `${user.id}/${uid}.${extRef.current}`;
      const { error } = await supabase.storage
        .from("journal-audio")
        .upload(path, blob, { contentType: blob.type || "audio/webm", upsert: false });
      if (error) return null;
      return path;
    } catch {
      return null;
    }
  }

  async function onSave() {
    if (listening) stopListening();
    setSaving(true);
    try {
      const audioPath = await uploadAudio();
      const res = await save(text, audioPath);
      if (res.ok) {
        setSaved(true);
        toast("Saved.", "success");
        if (clearOnSave) {
          setText("");
          finalRef.current = "";
        }
        clearAudio();
        router.refresh();
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
  const hasAudio = !!audioUrl;
  const canSave = dirty || hasAudio || (clearOnSave && !!text.trim());
  const showMic = supported || audioOk;

  return (
    <div className="w-full rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 text-left">
      <div className="flex items-center gap-2">
        <NotebookPen className="h-4 w-4 text-[var(--accent-primary)]" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {hint ??
          (showMic
            ? "Leave a note — type it, or tap the mic to talk."
            : "Leave a note. Tip: use your keyboard's mic to dictate.")}
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
        {showMic && (
          <button
            type="button"
            onClick={toggle}
            aria-label={listening ? "Stop recording" : "Start recording"}
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

      {/* Recorded voice memo preview. */}
      {hasAudio && !listening && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[var(--surface-secondary)] p-2">
          <audio src={audioUrl ?? undefined} controls className="h-9 w-full" />
          <button
            type="button"
            onClick={clearAudio}
            aria-label="Discard recording"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--danger,#e5484d)]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-[var(--text-muted)]">
          {listening ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--accent-primary)]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-primary)]" />
              {audioOk ? "Recording…" : "Listening…"}
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
          disabled={saving || !canSave}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}
