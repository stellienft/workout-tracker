import Link from "next/link";
import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { MarkAllRead } from "@/components/notifications/mark-all-read";

export const metadata = { title: "Notifications" };

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function NotificationsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const list = notifications ?? [];
  const hasUnread = list.some((n) => !n.read_at);

  return (
    <PageShell>
      <PageHeader
        title="Notifications"
        subtitle="Updates from your coach and clients."
        action={hasUnread ? <MarkAllRead /> : undefined}
      />

      {list.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] py-16 text-center text-sm text-[var(--text-muted)]">
          <Bell className="h-6 w-6" />
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
          {list.map((n) => {
            const inner = (
              <div className="flex items-start gap-3 p-4">
                {!n.read_at && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                )}
                <div className={n.read_at ? "pl-5" : ""}>
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {timeAgo(n.created_at as string)}
                  </p>
                </div>
              </div>
            );
            return n.link ? (
              <Link
                key={n.id as string}
                href={n.link as string}
                className="block hover:bg-[var(--surface-secondary)]"
              >
                {inner}
              </Link>
            ) : (
              <div key={n.id as string}>{inner}</div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
