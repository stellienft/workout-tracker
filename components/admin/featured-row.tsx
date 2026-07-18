"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { toggleFeatured } from "@/lib/actions/admin";

export function FeaturedRow({
  item,
}: {
  item: {
    id: string;
    placement: string;
    content_type: string;
    headline: string | null;
    subheading: string | null;
    active: boolean;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState(item.active);

  function toggle() {
    const next = !active;
    setActive(next);
    startTransition(async () => {
      const res = await toggleFeatured(item.id, next);
      if (res.ok) toast(next ? "Shown." : "Hidden.", "success");
      else {
        setActive(!next);
        toast(res.error ?? "Failed", "error");
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
      <div className="min-w-0">
        <p className="truncate font-medium">{item.headline ?? "(no headline)"}</p>
        <p className="truncate text-xs text-[var(--text-muted)]">
          {item.placement} · {item.content_type}
        </p>
        {item.subheading && (
          <p className="truncate text-xs text-[var(--text-secondary)]">
            {item.subheading}
          </p>
        )}
      </div>
      <button
        onClick={toggle}
        disabled={pending}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          active ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-elevated)]"
        }`}
        role="switch"
        aria-checked={active}
        aria-label="Toggle featured"
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-black transition-transform ${
            active ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
