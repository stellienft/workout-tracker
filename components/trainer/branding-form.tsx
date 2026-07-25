"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateTenant } from "@/lib/actions/trainer";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  accent_color: string | null;
  tagline: string | null;
  custom_domain: string | null;
  payment_url?: string | null;
  payment_instructions?: string | null;
}

export function TrainerBrandingForm({ tenant }: { tenant: Tenant }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tenant.name);
  const [tagline, setTagline] = useState(tenant.tagline ?? "");
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url ?? "");
  const [accentColor, setAccentColor] = useState(tenant.accent_color ?? "#CCFF30");
  const [customDomain, setCustomDomain] = useState(tenant.custom_domain ?? "");
  const [paymentUrl, setPaymentUrl] = useState(tenant.payment_url ?? "");
  const [paymentInstructions, setPaymentInstructions] = useState(
    tenant.payment_instructions ?? ""
  );

  function save() {
    startTransition(async () => {
      const res = await updateTenant({
        name,
        tagline,
        logoUrl,
        accentColor,
        customDomain,
        paymentUrl,
        paymentInstructions,
      });
      if (res.ok) {
        toast("Branding saved.", "success");
        setEditing(false);
      } else {
        toast(res.error ?? "Could not save", "error");
      }
    });
  }

  // Collapsed summary — the default resting state.
  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="h-9 w-9 shrink-0 rounded-full border border-[var(--border-subtle)]"
            style={{ backgroundColor: accentColor }}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="truncate font-semibold">{name}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {tagline || "No tagline"} · /{tenant.slug}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setEditing(true)}
          variant="secondary"
          size="sm"
          className="shrink-0"
        >
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Business name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Tagline</span>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Your coaching tagline"
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Logo URL</span>
        <input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://… (PNG/SVG, transparent background recommended)"
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
        <span className="text-xs text-[var(--text-muted)]">
          Upload your logo to any image host and paste the URL here.
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Accent colour</span>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="h-11 w-16 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)]"
          />
          <input
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="h-11 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          Used for buttons, highlights, and links in your portal.
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Custom domain (optional)</span>
        <input
          value={customDomain}
          onChange={(e) => setCustomDomain(e.target.value)}
          placeholder="train.yourbrand.com"
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>

      <div className="border-t border-[var(--border-subtle)] pt-4">
        <p className="text-sm font-semibold">Getting paid</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          You collect payment your own way. Add a payment link and instructions —
          clients on a package see these to pay you.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Payment link (optional)</span>
        <input
          value={paymentUrl}
          onChange={(e) => setPaymentUrl(e.target.value)}
          placeholder="https://buy.stripe.com/… or PayPal.me/you"
          className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
        <span className="text-xs text-[var(--text-muted)]">
          A Stripe Payment Link, PayPal.me, or any checkout URL you use.
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Payment instructions (optional)</span>
        <textarea
          value={paymentInstructions}
          onChange={(e) => setPaymentInstructions(e.target.value)}
          rows={3}
          placeholder="e.g. Bank transfer to BSB 000-000 Acct 12345678, ref your name."
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>

      <div className="rounded-xl bg-[var(--surface-secondary)] p-3 text-xs text-[var(--text-muted)]">
        <span className="font-medium text-[var(--text-secondary)]">Your portal slug:</span>{" "}
        {tenant.slug}
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={pending} size="lg" className="flex-1">
          {pending ? "Saving…" : "Save branding"}
        </Button>
        <Button
          onClick={() => setEditing(false)}
          variant="secondary"
          size="lg"
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
