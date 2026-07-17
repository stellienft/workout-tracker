import Link from "next/link";
import { requireUser, getAuthContext, isAdminRole } from "@/lib/auth";
import { getPrimaryGoal } from "@/lib/queries";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { signOut } from "@/lib/actions/auth";
import {
  BookOpen,
  Library,
  Target,
  ClipboardCheck,
  Pill,
  Settings,
  ShieldCheck,
  Bookmark,
  LogOut,
  ChevronRight,
} from "lucide-react";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user } = await requireUser();
  const { profile, roles } = await getAuthContext();
  const goal = await getPrimaryGoal(user.id);
  const isAdmin = isAdminRole(roles);
  const name = profile?.full_name || "Athlete";
  const email = profile?.email || user.email || "";

  const links = [
    { href: "/programs", label: "Programs", icon: BookOpen },
    { href: "/programs/saved", label: "Saved programs", icon: Bookmark },
    { href: "/exercises", label: "Exercise library", icon: Library },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/check-ins", label: "Check-ins", icon: ClipboardCheck },
    ...(profile?.medication_tracking_enabled
      ? [{ href: "/medication", label: "Medication", icon: Pill }]
      : []),
    { href: "/settings", label: "Settings", icon: Settings },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <PageShell>
      <PageHeader title="Profile" />
      <div className="mt-6 flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-muted)] text-xl font-bold text-[var(--accent-primary)]">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{name}</p>
          <p className="truncate text-sm text-[var(--text-muted)]">{email}</p>
          {goal && (
            <p className="mt-0.5 text-xs text-[var(--accent-primary)]">
              Goal: {goal.name}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-3 p-4 hover:bg-[var(--surface-secondary)]"
            >
              <Icon className="h-5 w-5 text-[var(--text-secondary)]" />
              <span className="flex-1 font-medium">{l.label}</span>
              <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
            </Link>
          );
        })}
      </div>

      <form action={signOut} className="mt-4">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4 text-sm text-[var(--danger)]"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </form>
    </PageShell>
  );
}
