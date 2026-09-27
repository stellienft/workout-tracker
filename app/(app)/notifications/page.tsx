import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { MarkAllRead } from "@/components/notifications/mark-all-read";
import { ClearAll } from "@/components/notifications/clear-all";
import {
  NotificationList,
  type NotificationRow,
} from "@/components/notifications/notification-list";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const list = (notifications ?? []) as NotificationRow[];
  const hasUnread = list.some((n) => !n.read_at);

  return (
    <PageShell>
      <PageHeader
        title="Notifications"
        subtitle="Updates from your coach, clients and friends."
        action={
          list.length > 0 ? (
            <div className="flex items-center gap-2">
              {hasUnread && <MarkAllRead />}
              <ClearAll />
            </div>
          ) : undefined
        }
      />
      <NotificationList items={list} />
    </PageShell>
  );
}
