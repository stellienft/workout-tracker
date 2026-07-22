import { redirect } from "next/navigation";
import { getAuthContext, isAdminRole, isTrainerRole } from "@/lib/auth";
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
  const [{ count: clientCount }, { count: unreadCount }] = await Promise.all([
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
  ]);
  const isClient = (clientCount ?? 0) > 0;
  const unread = unreadCount ?? 0;

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
          unread={unread}
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
            unread={unread}
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
