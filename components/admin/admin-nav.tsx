"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/goals", label: "Goals" },
  { href: "/admin/programs", label: "Programs" },
  { href: "/admin/exercises", label: "Exercises" },
  { href: "/admin/videos", label: "Videos" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/featured-content", label: "Featured" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav({ mobile }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      className={cn(
        mobile
          ? "no-scrollbar flex gap-2 overflow-x-auto"
          : "flex flex-1 flex-col gap-1 px-3"
      )}
    >
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              mobile
                ? "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm"
                : "rounded-xl px-3 py-2 text-sm",
              active
                ? mobile
                  ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                  : "bg-[var(--accent-muted)] text-[var(--accent-primary)] font-semibold"
                : mobile
                  ? "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-primary)] hover:text-white"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
