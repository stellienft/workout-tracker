"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the browser console; the digest ties back to the server log.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--background-primary)] px-6 text-center">
      <h1 className="text-2xl font-extrabold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-[var(--text-secondary)]">
        We hit an unexpected error loading this page. Please try again — if it
        keeps happening, it should clear shortly.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={reset}
          className="rounded-2xl bg-[var(--accent-primary)] px-5 py-3 font-semibold text-[var(--accent-ink)]"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="rounded-2xl border border-[var(--border-subtle)] px-5 py-3 text-sm font-medium"
        >
          Go to dashboard
        </a>
      </div>
      {error.digest && (
        <p className="mt-2 text-xs text-[var(--text-muted)]">Reference: {error.digest}</p>
      )}
    </div>
  );
}
