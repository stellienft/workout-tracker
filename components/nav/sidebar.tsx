"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function Sidebar({
  isAdmin,
  isTrainer,
  isClient,
  unread,
  name,
  email,
}: {
  isAdmin: boolean;
  isTrainer: boolean;
  isClient: boolean;
  unread: number;
  name: string;
  email: string;
}) {
  const pathname = usePathname();
  const items = sidebarItems.filter(
    (i) =>
      (!i.adminOnly || isAdmin) &&
      (!i.trainerOnly || isTrainer) &&
      (!i.clientOnly || isClient)
  );

  return (
    <aside className="hidden md:flex md:w-[248px] lg:w-[264px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--background-secondary)] h-dvh sticky top-0">
      <div className="flex items-center justify-between px-6 py-6">
        <Link href="/dashboard" className="text-xl font-extrabold tracking-tight">
          Stellio <span className="text-[var(--accent-primary)]">Fit</span>
        </Link>
        <NotificationBell unread={unread} />
      </div>
      <nav className="flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-[var(--accent-muted)] text-[var(--accent-primary)] font-semibold"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-[var(--border-subtle)] p-3">
        <div className="flex items-center gap-3 rounded-2xl px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-muted)] text-sm font-bold text-[var(--accent-primary)]">
            {(name || email).charAt(0).toUpperCase()}
          </div>
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
