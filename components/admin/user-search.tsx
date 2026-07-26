"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

export function UserSearch({
  initialQuery,
  initialPage,
}: {
  initialQuery: string;
  initialPage: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQuery);

  // Keep the input in sync when the URL changes (e.g. pagination click)
  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    router.push(
      `/admin/users${trimmed ? `?q=${encodeURIComponent(trimmed)}` : ""}`
    );
  }

  return (
    <form onSubmit={submit} className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or email…"
        className="h-10 w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] pl-10 pr-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
      />
    </form>
  );
}
