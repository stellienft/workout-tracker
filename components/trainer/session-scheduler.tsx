"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Clock, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { scheduleSession, cancelSession } from "@/lib/actions/scheduling";

export interface SessionRow {
  id: string;
  scheduled_at: string;
  duration_min: number;
  type: "session" | "check_in";
  location: string | null;
  notes: string | null;
  status: string;
}

export function SessionScheduler({
  clientUserId,
  upcoming,
}: {
  clientUserId: string;
  upcoming: SessionRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [when, setWhen] = useState("");
  const [type, setType] = useState<"session" | "check_in">("session");
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  function submit() {
    if (!when) {
      toast("Pick a date and time.", "error");
      return;
    }
    startTransition(async () => {
      const res = await scheduleSession({
        clientUserId,
        scheduledAt: new Date(when).toISOString(),
        durationMin: duration,
        type,
        location,
        notes,
      });
      if (res.ok) {
        toast("Session scheduled — client notified.", "success");
        setWhen("");
        setLocation("");
        setNotes("");
        router.refresh();
      } else {
        toast(res.error ?? "Could not schedule", "error");
      }
    });
  }

  function cancel(id: string) {
    if (!confirm("Cancel this session?")) return;
    startTransition(async () => {
      const res = await cancelSession(id);
      if (res.ok) {
        toast("Session cancelled.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Could not cancel", "error");
      }
    });
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <p className="flex items-center gap-2 font-semibold">
        <CalendarPlus className="h-4 w-4 text-[var(--accent-primary)]" /> Schedule a
        session
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
        <div className="flex gap-2">
          {(["session", "check_in"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 rounded-xl border py-2 text-sm capitalize ${
                type === t
                  ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                  : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              {t === "check_in" ? "Check-in" : "Session"}
            </button>
          ))}
        </div>
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        >
          {[15, 30, 45, 60, 90].map((n) => (
            <option key={n} value={n}>
              {n} min
            </option>
          ))}
        </select>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location or video link (optional)"
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
      </div>
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes for your client (optional)"
        className="mt-2 h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
      />
      <Button onClick={submit} disabled={pending} className="mt-3 w-full sm:w-auto">
        {pending ? "Saving…" : "Schedule & notify"}
      </Button>

      {upcoming.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold">Upcoming</p>
          <div className="mt-2 space-y-2">
            {upcoming.map((s) => (
              <div
                key={s.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {s.type === "check_in" ? "Check-in" : "Session"} ·{" "}
                    {new Date(s.scheduled_at).toLocaleString()}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {s.duration_min} min
                    </span>
                    {s.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {s.location}
                      </span>
                    )}
                  </p>
                  {s.notes && (
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{s.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => cancel(s.id)}
                  disabled={pending}
                  aria-label="Cancel session"
                  className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
