import { redirect } from "next/navigation";
import { getAuthContext, isAdminRole, isTrainerRole } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { MobileTopBar } from "@/components/nav/mobile-top-bar";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeSync } from "@/components/theme-sync";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, roles } = await getAuthContext();
  if (!user) redirect("/login");

  const isAdmin = isAdminRole(roles);
  const isTrainer = isTrainerRole(roles);

  // Whether this member is connected to a coach (active or a pending invite) —
  // drives "My Coach" — plus the unread notification count for the bell.
  const supabase = await createClient();
  const [{ count: clientCount }, { count: unreadCount }, { count: pendingFriends }] = await Promise.all([
    supabase
      .from("trainer_clients")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["active", "pending"]),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
    supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending"),
  ]);

  // Unread coach messages — needs a sub-query for the user's chat threads
  let unreadCoach = 0;
  const { data: myThreads } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("client_id", user.id);
  if (myThreads && myThreads.length > 0) {
    const { count } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .neq("sender_id", user.id) // only messages from the coach, not my own
      .in("thread_id", myThreads.map((t: { id: string }) => t.id));
    unreadCoach = count ?? 0;
  }

  const isClient = (clientCount ?? 0) > 0;
  const unread = unreadCount ?? 0;
  const { isPro } = await getUserPlan();

  // Per-nav badge counts
  const navBadges: Record<string, number> = {};
  if ((pendingFriends ?? 0) > 0) navBadges["/friends"] = pendingFriends!;
  if (unreadCoach > 0) navBadges["/my-coach"] = unreadCoach;

  // Gate the app behind setup. Trainers get their own setup flow; members get
  // the goal-based onboarding. Both routes live outside this layout.
  if (!profile?.onboarding_completed) {
    redirect(isTrainer ? "/trainer-setup" : "/onboarding");
  }
  const name = profile?.full_name ?? "";
  const email = profile?.email ?? user.email ?? "";
  const avatarUrl = profile?.avatar_url ?? null;

  return (
    <ToastProvider>
      <ThemeSync
        theme={profile?.theme_preference ?? "dark"}
        accent={profile?.accent_color ?? "#ccff30"}
      />
      <div className="flex min-h-dvh">
        <Sidebar
          isAdmin={isAdmin}
          isTrainer={isTrainer}
          isClient={isClient}
          isPro={isPro}
          unread={unread}
          navBadges={navBadges}
          name={name}
          email={email}
          avatarUrl={avatarUrl}
        />
        <div className="flex-1 min-w-0 pb-24 md:pb-0">
          {/* Mobile: top bar with menu (clients/trainers reach their areas here)
              + notification bell — replaces the old floating bell that overlapped
              page content. */}
          <MobileTopBar
            isAdmin={isAdmin}
            isTrainer={isTrainer}
            isClient={isClient}
            isPro={isPro}
            unread={unread}
            navBadges={navBadges}
            name={name}
            email={email}
            avatarUrl={avatarUrl}
          />
          {children}
        </div>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
