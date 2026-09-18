"use client";

import { AlarmClock, CloudSun, Repeat } from "lucide-react";
import { formatClock, formatWhen } from "@/lib/hub/when";
import { describeRepeat, effectiveFireAt } from "@/lib/hub/alarms";
import type { HubAlarm, HubSettings } from "@/lib/hub/types";

/**
 * The ambient face: what the tablet shows when nobody is talking to it.
 * Big enough to read across a room, quiet enough to live on a bench all day.
 */
export function HubFace({
  now,
  settings,
  weatherGlance,
  nextAlarm,
  dimmed,
}: {
  now: Date;
  settings: HubSettings;
  weatherGlance: string | null;
  nextAlarm: HubAlarm | null;
  dimmed: boolean;
}) {
  const time = formatClock(now, settings.use24h);
  const [clock, meridiem] = settings.use24h ? [time, null] : time.split(" ");
  const greeting = greetingFor(now.getHours(), settings.displayName);

  return (
    <div
      className={`flex flex-col justify-center transition-opacity duration-1000 ${
        dimmed ? "opacity-40" : "opacity-100"
      }`}
    >
      <p className="text-[var(--text-secondary)] text-lg sm:text-xl font-medium">
        {greeting}
      </p>

      <div className="flex items-baseline gap-3 leading-none">
        <span
          className="font-display font-bold tabular-nums tracking-tight text-[clamp(4.5rem,18vw,11rem)]"
          suppressHydrationWarning
        >
          {clock}
        </span>
        {meridiem ? (
          <span className="text-[var(--text-secondary)] text-2xl sm:text-4xl font-semibold uppercase">
            {meridiem}
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-lg sm:text-2xl text-[var(--text-secondary)]" suppressHydrationWarning>
        {now.toLocaleDateString("en-AU", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        {weatherGlance ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 py-2 text-base">
            <CloudSun className="h-5 w-5 text-[var(--accent-primary)]" />
            {weatherGlance}
          </span>
        ) : null}

        {nextAlarm ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 py-2 text-base">
            <AlarmClock className="h-5 w-5 text-[var(--accent-primary)]" />
            {describeRepeat(nextAlarm.repeatDays) ? (
              <>
                <Repeat className="h-4 w-4 text-[var(--text-muted)]" />
                {describeRepeat(nextAlarm.repeatDays)} at{" "}
                {formatClock(effectiveFireAt(nextAlarm), settings.use24h)}
              </>
            ) : (
              formatWhen(effectiveFireAt(nextAlarm), now, settings.use24h)
            )}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function greetingFor(hour: number, name: string | null): string {
  const part =
    hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
}
