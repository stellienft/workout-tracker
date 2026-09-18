"use client";

import { useState, useTransition } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { disconnectStrava, syncStravaActivities } from "@/lib/actions/strava";

const STRAVA = "#FC4C02";

function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 90) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export function StravaConnect({
  configured,
  connected,
  lastSyncedAt,
}: {
  configured: boolean;
  connected: boolean;
  lastSyncedAt: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [isConnected, setIsConnected] = useState(connected);
  const synced = timeAgo(lastSyncedAt);

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

  function disconnect() {
    startTransition(async () => {
      const res = await disconnectStrava();
      if (res.ok) {
        setIsConnected(false);
        toast("Strava disconnected.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Could not disconnect", "error");
      }
    });
  }

  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${STRAVA}26`, color: STRAVA }}
      >
        <Activity className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Strava</p>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          {!configured
            ? "Not available yet — the app owner needs to add Strava credentials."
            : isConnected
              ? `Runs, rides and more import automatically.${synced ? ` Last sync ${synced}.` : ""}`
              : "Connect to bring your runs, rides and cardio into Ares."}
        </p>
      </div>
      {configured &&
        (isConnected ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={sync}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-60"
            >
              <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Sync
            </button>
            <button
              onClick={disconnect}
              disabled={pending}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-60"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <a
            href="/api/strava/login?return=/settings"
            className="inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: STRAVA }}
          >
            Connect
          </a>
        ))}
    </div>
  );
}
