"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, ArrowLeft } from "lucide-react";
import { sidebarItems, bottomNavItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import { NotificationBell } from "@/components/notifications/notification-bell";

// Top-level destinations reachable from the nav — these don't get a back button.
const ROOT_PATHS = new Set(
  [...sidebarItems, ...bottomNavItems].map((i) => i.href)
);

export function MobileTopBar({
  isAdmin,
  isTrainer,
  isClient,
  unread,
  name,
  email,
  avatarUrl,
}: {
  isAdmin: boolean;
  isTrainer: boolean;
  isClient: boolean;
  unread: number;
  name: string;
  email: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Show a back button on any page that isn't a top-level nav destination.
  const showBack = !ROOT_PATHS.has(pathname);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      // Deep-linked in with no in-app history: fall back to the parent path.
      const parent = pathname.split("/").slice(0, -1).join("/") || "/dashboard";
      router.push(parent);
    }
  }

  const items = sidebarItems.filter(
    (i) =>
      (!i.adminOnly || isAdmin) &&
      (!i.trainerOnly || isTrainer) &&
      (!i.clientOnly || isClient)
  );

  return (
    <>
      <div className="pt-safe sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--background-secondary)] px-4 py-2.5 md:hidden">
        <div className="flex items-center gap-1">
          {showBack && (
            <button
              onClick={goBack}
              aria-label="Go back"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)]"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          )}
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)]"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <Link href="/dashboard" className="text-lg font-extrabold tracking-tight">
          Stellio <span className="text-[var(--accent-primary)]">Fit</span>
        </Link>
        <NotificationBell unread={unread} className="h-10 w-10" />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="pt-safe absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-[var(--background-secondary)]">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-lg font-extrabold tracking-tight">
                Stellio <span className="text-[var(--accent-primary)]">Fit</span>
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-[var(--text-secondary)]"
              >
                <X className="h-6 w-6" />
              </button>
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
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                          active
                            ? "bg-[var(--accent-muted)] font-semibold text-[var(--accent-primary)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-primary)]"
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

            <div className="border-t border-[var(--border-subtle)] p-3 pb-safe">
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
                    className="rounded-xl p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
