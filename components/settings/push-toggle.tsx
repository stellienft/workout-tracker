"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  savePushSubscription,
  deletePushSubscription,
  sendTestPush,
} from "@/lib/actions/push";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushToggle() {
  const toast = useToast();
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(!!sub))
      .catch(() => {});
  }, []);

  async function enable() {
    if (!vapid) {
      toast("Push isn't configured yet (missing server key).", "error");
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast("Notifications were blocked. Enable them in your browser settings.", "error");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      });
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (!res.ok) throw new Error(res.error);
      setEnabled(true);
      await sendTestPush();
      toast("Reminders on — check for a test notification.", "success");
    } catch {
      toast("Couldn't enable reminders. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setEnabled(false);
      toast("Reminders turned off.", "success");
    } catch {
      toast("Couldn't turn reminders off.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 text-sm text-[var(--text-secondary)]">
        Push notifications aren&apos;t supported in this browser. On iPhone, add
        Stellio Fit to your Home Screen first, then enable them here.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
          {enabled ? (
            <Bell className="h-5 w-5 text-[var(--accent-primary)]" />
          ) : (
            <BellOff className="h-5 w-5 text-[var(--text-muted)]" />
          )}
        </div>
        <div>
          <p className="font-medium">Workout reminders</p>
          <p className="text-xs text-[var(--text-muted)]">
            Streak nudges and a daily reminder if you haven&apos;t trained.
          </p>
        </div>
      </div>
      <button
        onClick={enabled ? disable : enable}
        disabled={busy}
        className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
          enabled
            ? "border border-[var(--border-subtle)] text-[var(--text-secondary)]"
            : "bg-[var(--accent-primary)] text-black"
        }`}
      >
        {busy ? "…" : enabled ? "Turn off" : "Enable"}
      </button>
    </div>
  );
}
