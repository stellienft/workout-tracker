import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Intent } from "@/lib/hub/intents";

export const dynamic = "force-dynamic";

/**
 * Fallback interpreter for utterances the local parser couldn't classify.
 *
 * The hub always tries lib/hub/intents.ts first — it is instant and works
 * offline. This route exists for the long tail: unusual phrasings of a known
 * command, and general questions a speaker in a kitchen gets asked ("how many
 * grams in an ounce"). It returns either an Intent in exactly the local
 * parser's shape, or a short spoken answer.
 *
 * With no ANTHROPIC_API_KEY set the hub degrades cleanly to local-only parsing.
 */

const SYSTEM = `You are the intent parser for a voice-controlled home hub speaker.

Return ONLY a JSON object, no prose and no code fences.

Either map the utterance to one of these commands:
  {"kind":"set_alarm","at":"<ISO8601 with offset>","label":null,"repeat":null}
  {"kind":"set_timer","ms":<number>,"label":null}
  {"kind":"cancel","target":"alarms"|"timers"|"all"}
  {"kind":"list_alarms"}
  {"kind":"stop"}
  {"kind":"snooze","ms":<number>}
  {"kind":"weather","window":"now"|"today"|"tomorrow"|"week","place":null|"<place>"}
  {"kind":"music_play","query":null|"<search text>"}
  {"kind":"music_control","action":"pause"|"resume"|"next"|"previous"}
  {"kind":"music_volume","level":<0-100>|null,"direction":"up"|"down"|null}
  {"kind":"now_playing"}
  {"kind":"time"}
  {"kind":"date"}

Or, if it is a general question or remark rather than a command, answer it:
  {"kind":"answer","text":"<one or two short sentences, written to be read aloud>"}

Rules:
- "repeat" is an array of weekday numbers (0=Sunday) for recurring alarms, else null.
- Resolve relative times against the supplied current time, in the supplied timezone.
- Spoken answers must be brief: no lists, no markdown, no URLs.
- If you genuinely cannot tell what was meant, return {"kind":"unknown","text":"<the utterance>"}.`;

interface Body {
  text?: string;
  /** Client's current time, so relative phrasing resolves in the user's zone. */
  now?: string;
  timezone?: string;
}

/** Pull the first JSON object out of a model reply, tolerating stray prose. */
function extractJson(raw: string): unknown | null {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

const KINDS = new Set([
  "set_alarm", "set_timer", "cancel", "list_alarms", "stop", "snooze",
  "weather", "music_play", "music_control", "music_volume", "now_playing",
  "time", "date", "answer", "unknown",
]);

/** Accept only well-formed intents — a malformed one must not set an alarm. */
function validate(value: unknown): Intent | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const kind = obj.kind;
  if (typeof kind !== "string" || !KINDS.has(kind)) return null;

  if (kind === "set_alarm") {
    const at = typeof obj.at === "string" ? new Date(obj.at) : null;
    if (!at || Number.isNaN(at.getTime())) return null;
    const repeat = Array.isArray(obj.repeat)
      ? obj.repeat.filter((d): d is number => typeof d === "number" && d >= 0 && d <= 6)
      : null;
    return {
      kind: "set_alarm",
      at: at.toISOString(),
      label: typeof obj.label === "string" ? obj.label : null,
      repeat: repeat && repeat.length > 0 ? repeat : null,
    };
  }
  if (kind === "set_timer" || kind === "snooze") {
    const ms = typeof obj.ms === "number" ? obj.ms : NaN;
    if (!Number.isFinite(ms) || ms <= 0 || ms > 24 * 3600_000) return null;
    return kind === "snooze"
      ? { kind: "snooze", ms }
      : { kind: "set_timer", ms, label: typeof obj.label === "string" ? obj.label : null };
  }
  if (kind === "answer") {
    const text = typeof obj.text === "string" ? obj.text.trim() : "";
    return text ? { kind: "answer", text: text.slice(0, 600) } : null;
  }
  // The remaining kinds carry only enumerated fields; pass them through as-is
  // and let the client's switch ignore anything it doesn't recognise.
  return value as Intent;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const text = (body.text ?? "").trim().slice(0, 400);
  if (!text) return NextResponse.json({ intent: null });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ intent: null, reason: "not-configured" });

  const now = body.now && !Number.isNaN(Date.parse(body.now)) ? body.now : new Date().toISOString();
  const timezone = (body.timezone ?? "Australia/Brisbane").slice(0, 60);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Current time: ${now}\nTimezone: ${timezone}\nUtterance: ${text}`,
          },
        ],
      }),
      // A speaker that pauses for 15s has already failed; give up and say so.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return NextResponse.json({ intent: null, reason: "upstream" });

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const raw = (data.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("")
      .trim();

    const intent = validate(extractJson(raw));
    return NextResponse.json({ intent });
  } catch {
    return NextResponse.json({ intent: null, reason: "error" });
  }
}
