import { redirect } from "next/navigation";
import { getAuthContext, isAdminRole, isTrainerRole } from "@/lib/auth";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { ToastProvider } from "@/components/ui/toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, roles } = await getAuthContext();
  if (!user) redirect("/login");

  // Gate the app behind onboarding, except the onboarding routes themselves.
  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  const isAdmin = isAdminRole(roles);
  const isTrainer = isTrainerRole(roles);
  const name = profile?.full_name ?? "";
  const email = profile?.email ?? user.email ?? "";

  return (
    <ToastProvider>
      <div className="flex min-h-dvh">
        <Sidebar
          isAdmin={isAdmin}
          isTrainer={isTrainer}
          name={name}
          email={email}
        />
        <div className="flex-1 min-w-0 pb-24 md:pb-0">{children}</div>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
