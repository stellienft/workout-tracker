"use client";

import { useState, useTransition } from "react";
import { MessageSquarePlus, Send, Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { submitFeedback } from "@/lib/actions/feedback";

const CATEGORIES = [
  { key: "feedback", label: "General" },
  { key: "feature", label: "Feature idea" },
  { key: "bug", label: "Bug" },
  { key: "other", label: "Other" },
] as const;

const PLACEHOLDERS: Record<string, string> = {
  feedback: "What do you love, what could be better?",
  feature: "What feature or improvement would you like to see?",
  bug: "What went wrong? Where in the app did it happen?",
  other: "Anything else you'd like to share…",
};

export function FeedbackForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<string>("feedback");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [sent, setSent] = useState(false);

  function submit() {
    if (message.trim().length < 4) {
      toast("Please add a little more detail.", "error");
      return;
    }
    startTransition(async () => {
      const res = await submitFeedback({ category, message: message.trim(), email });
      if (res.ok) {
        setSent(true);
        setMessage("");
        toast("Thanks — your feedback was sent.", "success");
      } else {
        toast(res.error ?? "Couldn't send feedback", "error");
      }
    });
  }

  if (sent) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-muted)]">
          <Check className="h-5 w-5 text-[var(--accent-primary)]" />
        </div>
        <p className="mt-3 font-semibold">Thank you!</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Your feedback has been sent. It genuinely helps shape what comes next.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-4 text-sm font-medium text-[var(--accent-primary)]"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="h-5 w-5 text-[var(--accent-primary)]" />
        <p className="font-semibold">Send feedback</p>
      </div>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Love something? Hit a snag? Want a new feature? Tell me — I read every one.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              category === c.key
                ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        maxLength={4000}
        placeholder={PLACEHOLDERS[category]}
        className="mt-3 w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2.5 text-sm focus:border-[var(--border-active)] focus:outline-none"
      />

      <label className="mt-3 block">
        <span className="text-xs text-[var(--text-muted)]">
          Email (optional — so I can reply)
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>

      <button
        onClick={submit}
        disabled={pending}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {pending ? "Sending…" : "Send feedback"}
      </button>
    </div>
  );
}
