"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { bottomNavItems } from "./nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const count = bottomNavItems.length;

  // First item whose route matches the current path — drives the sliding pill.
  const activeIndex = bottomNavItems.findIndex(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <nav
      className="brand-texture pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border-subtle)] bg-[var(--background-secondary)] md:hidden"
      aria-label="Primary"
    >
      <div className="relative mx-auto flex max-w-md items-stretch px-2 py-1.5">
        {/* Sliding active indicator */}
        {activeIndex >= 0 && (
          <span
            aria-hidden
            className="absolute bottom-1.5 top-1.5 left-2 rounded-2xl bg-[var(--accent-primary)]/18 ring-1 ring-[var(--accent-primary)]/35 transition-transform duration-[450ms] ease-[cubic-bezier(0.34,1.45,0.5,1)] will-change-transform"
            style={{
              width: `calc((100% - 16px) / ${count})`,
              transform: `translateX(calc(${activeIndex} * 100%))`,
            }}
          />
        )}

        {bottomNavItems.map((item, i) => {
          const active = i === activeIndex;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium transition-colors duration-300",
                active
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--text-secondary)]"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-[450ms] ease-[cubic-bezier(0.34,1.45,0.5,1)]",
                  active && "-translate-y-0.5 scale-110"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
