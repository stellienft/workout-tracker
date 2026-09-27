"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import {
  markNotificationRead,
  clearNotification,
} from "@/lib/actions/notifications";

export interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationList({ items }: { items: NotificationRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [list, setList] = useState(items);

  function open(n: NotificationRow) {
    // Mark read (optimistically), then follow the link.
    if (!n.read_at) {
      setList((l) =>
        l.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
      );
      startTransition(async () => {
        await markNotificationRead(n.id);
        if (!n.link) router.refresh();
      });
    }
    if (n.link) router.push(n.link);
  }

  function dismiss(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setList((l) => l.filter((x) => x.id !== id));
    startTransition(async () => {
      await clearNotification(id);
      router.refresh();
    });
  }

  if (list.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] py-16 text-center text-sm text-[var(--text-muted)]">
        <Bell className="h-6 w-6" />
        <p>No notifications.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
      {list.map((n) => (
        <div
          key={n.id}
          onClick={() => open(n)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") open(n);
          }}
          className="flex cursor-pointer items-start gap-3 p-4 hover:bg-[var(--surface-secondary)]"
        >
          {!n.read_at ? (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent-primary)]" />
          ) : (
            <span className="mt-1.5 h-2 w-2 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{n.title}</p>
            {n.body && (
              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{n.body}</p>
            )}
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {timeAgo(n.created_at)}
            </p>
          </div>
          <button
            onClick={(e) => dismiss(e, n.id)}
            aria-label="Dismiss notification"
            className="-m-1 shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
