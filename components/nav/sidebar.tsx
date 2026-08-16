"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navSections } from "./nav-items";
import { NavList } from "./nav-list";
import { signOut } from "@/lib/actions/auth";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function Sidebar({
  isAdmin,
  isTrainer,
  isClient,
  isPro,
  unread,
  navBadges,
  name,
  email,
  avatarUrl,
}: {
  isAdmin: boolean;
  isTrainer: boolean;
  isClient: boolean;
  isPro: boolean;
  unread: number;
  navBadges?: Record<string, number>;
  name: string;
  email: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const canSee = (i: {
    adminOnly?: boolean;
    trainerOnly?: boolean;
    clientOnly?: boolean;
  }) =>
    (!i.adminOnly || isAdmin) &&
    (!i.trainerOnly || isTrainer) &&
    (!i.clientOnly || isClient);

  const sections = navSections
    .map((s) => ({ ...s, items: s.items.filter(canSee) }))
    .filter((s) => s.items.length > 0);

  return (
    <aside className="hidden md:flex md:w-[248px] lg:w-[264px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--background-secondary)] h-dvh sticky top-0">
      <div className="flex items-center justify-between px-6 py-6">
        <Link href="/dashboard" className="text-xl font-extrabold tracking-tight">
          Stellio <span className="text-[var(--accent-primary)]">Fit</span>
        </Link>
        <NotificationBell unread={unread} />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <NavList
          sections={sections}
          pathname={pathname}
          isPro={isPro}
          navBadges={navBadges}
        />
      </nav>
      <div className="border-t border-[var(--border-subtle)] p-3">
        <div className="flex items-center gap-3 rounded-2xl px-3 py-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-muted)] text-sm font-bold text-[var(--accent-primary)]">
              {(name || email).charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name || "Athlete"}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">{email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
