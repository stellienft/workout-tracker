"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateSettings } from "@/lib/actions/tracking";
import { TIMEZONE_OPTIONS } from "@/lib/timezone";
import { INJURY_AREAS } from "@/lib/injury";
import { MapPin, Check } from "lucide-react";

export function SettingsForm({
  initial,
}: {
  initial: {
    fullName: string;
    unitPreference: "metric" | "imperial";
    hapticsEnabled: boolean;
    medicationTracking: boolean;
    dailyQuote: boolean;
    motivationPush: boolean;
    feedNotifications: boolean;
    injuryAreas: string[];
    considerations: string;
    timezone: string;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(initial.fullName);
  const [unit, setUnit] = useState(initial.unitPreference);
  const [haptics, setHaptics] = useState(initial.hapticsEnabled);
  const [medication, setMedication] = useState(initial.medicationTracking);
  const [dailyQuote, setDailyQuote] = useState(initial.dailyQuote);
  const [motivationPush, setMotivationPush] = useState(initial.motivationPush);
  const [feedNotifications, setFeedNotifications] = useState(initial.feedNotifications);
  const [injuryAreas, setInjuryAreas] = useState<string[]>(initial.injuryAreas);
  const [considerations, setConsiderations] = useState(initial.considerations);
  const [timezone, setTimezone] = useState(initial.timezone);

  function toggleArea(value: string) {
    setInjuryAreas((cur) =>
      cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]
    );
  }

  // Ensure the current value is always selectable, even if it isn't one of
  // the curated options (e.g. detected from an unusual device timezone).
  const tzOptions = TIMEZONE_OPTIONS.some((o) => o.value === timezone)
    ? TIMEZONE_OPTIONS
    : [{ value: timezone, label: timezone }, ...TIMEZONE_OPTIONS];

  function detectTimezone() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        setTimezone(tz);
        toast(`Detected ${tz}. Don't forget to save.`, "success");
      }
    } catch {
      toast("Couldn't detect your timezone.", "error");
    }
  }

  function save() {
    startTransition(async () => {
      const res = await updateSettings({
        fullName,
        unitPreference: unit,
        hapticsEnabled: haptics,
        medicationTracking: medication,
        dailyQuoteEnabled: dailyQuote,
        motivationPushEnabled: motivationPush,
        feedNotificationsEnabled: feedNotifications,
        injuryAreas,
        considerations,
        timezone,
      });
      if (res.ok) {
        toast("Settings saved.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Could not save", "error");
      }
    });
  }

  return (
    <div className="space-y-5 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Full name</span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>

      <div>
        <span className="text-sm font-medium">Units</span>
        <div className="mt-2 flex gap-2">
          {(["metric", "imperial"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`flex-1 rounded-xl border py-2.5 text-sm capitalize ${
                unit === u
                  ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                  : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Timezone</span>
          <button
            type="button"
            onClick={detectTimezone}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--border-active)]"
          >
            <MapPin className="h-3.5 w-3.5" /> Use my device
          </button>
        </div>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        >
          {tzOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Used for your training week, streaks and daily logs. Defaults to
          Brisbane.
        </p>
      </div>

      <Toggle
        label="Haptic feedback"
        hint="Vibrate on set completion and rest-timer end (supported devices)."
        checked={haptics}
        onChange={setHaptics}
      />
      <Toggle
        label="Health & symptom tracking"
        hint="Show the Health tab to track symptoms, vitals and medications."
        checked={medication}
        onChange={setMedication}
      />
      <Toggle
        label="Daily motivation quote"
        hint="Show a motivational quote on your dashboard each day."
        checked={dailyQuote}
        onChange={setDailyQuote}
      />
      <Toggle
        label="Motivation push notifications"
        hint="Get the daily quote as a morning push (needs reminders enabled)."
        checked={motivationPush}
        onChange={setMotivationPush}
      />
      <Toggle
        label="Feed activity notifications"
        hint="Get notified when someone you follow comments on the feed."
        checked={feedNotifications}
        onChange={setFeedNotifications}
      />

      <div>
        <span className="text-sm font-medium">Sore or injured areas</span>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          We flag exercises that load these areas and suggest safer swaps.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INJURY_AREAS.map((a) => {
            const active = injuryAreas.includes(a.value);
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => toggleArea(a.value)}
                className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-sm transition-colors ${
                  active
                    ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-secondary)]"
                }`}
              >
                <span className="font-medium">{a.label}</span>
                {active && <Check className="h-4 w-4 text-[var(--accent-primary)]" />}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Anything else to note</span>
        <textarea
          value={considerations}
          onChange={(e) => setConsiderations(e.target.value)}
          rows={2}
          placeholder="e.g. Recovering from surgery — keep impact low."
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>

      <Button onClick={save} disabled={pending} size="lg" className="w-full">
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-elevated)]"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
