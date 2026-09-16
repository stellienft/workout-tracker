"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Activity, RefreshCw, Timer, Route, Mountain, HeartPulse, Footprints } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { syncStravaActivities } from "@/lib/actions/strava";

export interface ActivityRow {
  id: string;
  activity_type: string | null;
  name: string | null;
  distance_m: number | null;
  moving_time_s: number | null;
  elevation_m: number | null;
  average_hr: number | null;
  average_speed: number | null;
  steps: number | null;
  start_at: string;
}

function fmtDuration(s: number | null): string | null {
  if (!s) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function fmtDistance(m: number | null, metric: boolean): string | null {
  if (!m || m <= 0) return null;
  return metric
    ? `${(m / 1000).toFixed(2)} km`
    : `${(m / 1609.344).toFixed(2)} mi`;
}

/** Pace for runs/walks (min per km/mi); speed (km/h or mph) otherwise. */
function fmtPace(
  distanceM: number | null,
  movingS: number | null,
  type: string | null,
  metric: boolean
): string | null {
  if (!distanceM || !movingS || distanceM <= 0) return null;
  const paced = /run|walk|hike/i.test(type ?? "");
  if (paced) {
    const perUnit = movingS / (distanceM / (metric ? 1000 : 1609.344));
    const m = Math.floor(perUnit / 60);
    const s = Math.round(perUnit % 60);
    return `${m}:${String(s).padStart(2, "0")} /${metric ? "km" : "mi"}`;
  }
  const speed = distanceM / movingS; // m/s
  return metric
    ? `${(speed * 3.6).toFixed(1)} km/h`
    : `${(speed * 2.23694).toFixed(1)} mph`;
}

export function ActivitiesClient({
  activities,
  connected,
  configured,
  metric,
}: {
  activities: ActivityRow[];
  connected: boolean;
  configured: boolean;
  metric: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function sync() {
    startTransition(async () => {
      const res = await syncStravaActivities();
      if (res.ok) {
        toast(
          res.imported > 0
            ? `Imported ${res.imported} new ${res.imported === 1 ? "activity" : "activities"}.`
            : "You're up to date.",
          "success"
        );
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't sync", "error");
      }
    });
  }

  if (!connected) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] px-6 py-14 text-center">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: "#FC4C0226", color: "#FC4C02" }}
        >
          <Activity className="h-6 w-6" />
        </span>
        <p className="text-lg font-bold">Bring your cardio in</p>
        <p className="max-w-sm text-sm text-[var(--text-secondary)]">
          Connect Strava to import your runs, rides, swims and more automatically —
          distance, time, pace and heart rate, all in one place.
        </p>
        {configured ? (
          <a
            href="/api/strava/login?return=/activities"
            className="mt-1 inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "#FC4C02" }}
          >
            Connect Strava
          </a>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">
            Strava isn&apos;t configured yet — check back soon.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {activities.length} {activities.length === 1 ? "activity" : "activities"} imported
        </p>
        <button
          onClick={sync}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-60"
        >
          <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {pending ? "Syncing…" : "Sync"}
        </button>
      </div>

      {activities.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 text-center text-sm text-[var(--text-muted)]">
          No activities yet. Record something on Strava, then tap Sync.
        </p>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
          {activities.map((a) => {
            const distance = fmtDistance(a.distance_m, metric);
            const duration = fmtDuration(a.moving_time_s);
            const pace = fmtPace(a.distance_m, a.moving_time_s, a.activity_type, metric);
            const date = new Date(a.start_at).toLocaleDateString("en-AU", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
            return (
              <div key={a.id} className="flex items-start gap-3 p-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                  <Activity className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-semibold">{a.name || a.activity_type || "Activity"}</p>
                    <span className="shrink-0 text-xs text-[var(--text-muted)]">{date}</span>
                  </div>
                  <p className="text-xs capitalize text-[var(--accent-primary)]">
                    {(a.activity_type ?? "").replace(/([a-z])([A-Z])/g, "$1 $2")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                    {distance && (
                      <span className="inline-flex items-center gap-1">
                        <Route className="h-3.5 w-3.5" /> {distance}
                      </span>
                    )}
                    {duration && (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Timer className="h-3.5 w-3.5" /> {duration}
                      </span>
                    )}
                    {pace && <span className="tabular-nums">{pace}</span>}
                    {a.steps ? (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Footprints className="h-3.5 w-3.5" /> {a.steps.toLocaleString()} steps
                      </span>
                    ) : null}
                    {a.average_hr ? (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <HeartPulse className="h-3.5 w-3.5" /> {Math.round(a.average_hr)} bpm
                      </span>
                    ) : null}
                    {a.elevation_m && a.elevation_m > 0 ? (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Mountain className="h-3.5 w-3.5" /> {Math.round(a.elevation_m)} m
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
