import Link from "next/link";
import { Bell } from "lucide-react";

/** Bell + unread badge linking to the notifications page. */
export function NotificationBell({
  unread,
  className = "",
}: {
  unread: number;
  className?: string;
}) {
  return (
    <Link
      href="/notifications"
      aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] ${className}`}
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent-primary)] px-1 text-[11px] font-bold text-black">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
