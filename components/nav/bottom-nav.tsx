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
    // Wrapper spans the width but ignores pointer events so taps fall through
    // to content on either side of the floating bar.
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center md:hidden">
      <nav
        className="pointer-events-auto relative mx-4 mb-[calc(env(safe-area-inset-bottom,0px)+5px)] flex w-full max-w-md items-stretch rounded-full border border-white/10 bg-[var(--surface-elevated)]/92 p-1.5 shadow-[0_12px_34px_-6px_rgba(0,0,0,0.7)] ring-1 ring-black/20 backdrop-blur-xl"
        aria-label="Primary"
      >
        {/* Sliding active indicator */}
        {activeIndex >= 0 && (
          <span
            aria-hidden
            className="absolute bottom-1.5 top-1.5 left-1.5 rounded-full bg-[var(--accent-primary)]/20 ring-1 ring-[var(--accent-primary)]/40 transition-transform duration-[450ms] ease-[cubic-bezier(0.34,1.45,0.5,1)] will-change-transform"
            style={{
              width: `calc((100% - 12px) / ${count})`,
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
                "relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-2 text-[11px] font-medium transition-colors duration-300",
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
      </nav>
    </div>
  );
}
