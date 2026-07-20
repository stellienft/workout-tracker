"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 text-sm">
        <p className="font-semibold">Check your email</p>
        <p className="mt-1 text-[var(--text-secondary)]">
          If an account exists for <span className="text-[var(--text-primary)]">{email}</span>,
          we&apos;ve sent a link to reset your password. It may take a minute to
          arrive — check your spam folder too.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-[var(--accent-primary)] font-medium"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          Email
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className="h-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 text-white placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>
      {error && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={loading} className="mt-2">
        {loading ? "Sending…" : "Send reset link"}
      </Button>
      <Link
        href="/login"
        className="text-center text-sm text-[var(--text-secondary)]"
      >
        Back to sign in
      </Link>
    </form>
  );
}
