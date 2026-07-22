import { redirect } from "next/navigation";
import { getAuthContext, isAdminRole, isTrainerRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
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

  // Whether this member is an active client of any coach (drives "My Coach").
  const supabase = await createClient();
  const { count: clientCount } = await supabase
    .from("trainer_clients")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "active");
  const isClient = (clientCount ?? 0) > 0;

  // Gate the app behind setup. Trainers get their own setup flow; members get
  // the goal-based onboarding. Both routes live outside this layout.
  if (!profile?.onboarding_completed) {
    redirect(isTrainer ? "/trainer-setup" : "/onboarding");
  }
  const name = profile?.full_name ?? "";
  const email = profile?.email ?? user.email ?? "";

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
          name={name}
          email={email}
        />
        <div className="flex-1 min-w-0 pb-24 md:pb-0">{children}</div>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
