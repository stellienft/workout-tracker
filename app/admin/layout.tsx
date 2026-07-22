import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext, isAdminRole } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { ToastProvider } from "@/components/ui/toast";
import { signOut } from "@/lib/actions/auth";
import { ArrowLeft, LogOut } from "lucide-react";

export const metadata = { title: "Admin" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-verified role gate. Never trusts client state.
  const { user, roles, profile } = await getAuthContext();
  if (!user) redirect("/login");
  if (!isAdminRole(roles)) redirect("/dashboard");

  const isSuperAdmin = roles.includes("super_admin");

  return (
    <ToastProvider>
      <div className="flex min-h-dvh">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--background-secondary)] md:flex">
          <div className="px-5 py-5">
            <p className="text-lg font-extrabold">
              Stellio <span className="text-[var(--accent-primary)]">Admin</span>
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {isSuperAdmin ? "Super Administrator" : "Administrator"}
            </p>
          </div>
          <AdminNav />
          <div className="mt-auto border-t border-[var(--border-subtle)] p-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-4 w-4" /> Back to app
            </Link>
            <form action={signOut}>
              <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <div
            className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--background-secondary)] px-4 pb-3 md:hidden"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">
                Stellio <span className="text-[var(--accent-primary)]">Admin</span>
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-3.5 py-1.5 text-sm font-semibold text-black"
              >
                <ArrowLeft className="h-4 w-4" /> Exit
              </Link>
            </div>
            <div className="mt-2 md:hidden">
              <AdminNav mobile />
            </div>
          </div>
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</div>
          <p className="px-4 pb-8 text-center text-xs text-[var(--text-muted)]">
            Signed in as {profile?.email}
          </p>
        </main>
      </div>
    </ToastProvider>
  );
}
