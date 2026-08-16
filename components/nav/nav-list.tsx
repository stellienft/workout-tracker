"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavSection } from "./nav-items";

const STORAGE_KEY = "stellio-nav-open";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Shared navigation list used by both the desktop sidebar and the mobile
 * drawer. Titled sections collapse to keep the list short; the section holding
 * the current route is always expanded, and open/closed choices persist across
 * visits. The untitled top group (Dashboard, Feed) is always shown.
 */
export function NavList({
  sections,
  pathname,
  isPro,
  navBadges,
  onNavigate,
}: {
  sections: NavSection[];
  pathname: string;
  isPro: boolean;
  navBadges?: Record<string, number>;
  onNavigate?: () => void;
}) {
  // Everything starts expanded; members collapse the sections they don't use
  // and those choices are remembered. Deterministic here so SSR matches.
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const s of sections) {
      if (s.title) init[s.title] = true;
    }
    return init;
  });

  // After mount, apply the member's saved open/closed preferences (their
  // collapses); anything they haven't touched stays open.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setOpen((cur) => ({ ...cur, ...JSON.parse(raw) }));
    } catch {
      // ignore malformed storage
    }
  }, []);

  // Always keep the section containing the current route open.
  useEffect(() => {
    const activeTitle = sections.find(
      (s) => s.title && s.items.some((i) => isActive(pathname, i.href))
    )?.title;
    if (activeTitle) {
      setOpen((cur) => (cur[activeTitle] ? cur : { ...cur, [activeTitle]: true }));
    }
  }, [pathname, sections]);

  function toggle(title: string) {
    setOpen((cur) => {
      const next = { ...cur, [title]: !cur[title] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage failures (private mode, etc.)
      }
      return next;
    });
  }

  return (
    <>
      {sections.map((section, si) => {
        const expanded = !section.title || open[section.title];
        return (
          <div key={section.title ?? `top-${si}`} className={si > 0 ? "mt-3" : ""}>
            {section.title && (
              <button
                type="button"
                onClick={() => toggle(section.title!)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
              >
                <span>{section.title}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    expanded ? "" : "-rotate-90"
                  )}
                />
              </button>
            )}
            {expanded && (
              <ul className="mt-0.5 flex flex-col gap-1">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                          active
                            ? "bg-[var(--accent-muted)] font-semibold text-[var(--accent-primary)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {navBadges && navBadges[item.href] > 0 && (
                          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent-primary)] px-1 text-[10px] font-bold text-[var(--accent-ink)]">
                            {navBadges[item.href]}
                          </span>
                        )}
                        {item.pro && !isPro && (
                          <Lock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </>
  );
}
