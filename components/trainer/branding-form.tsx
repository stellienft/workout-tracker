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
}

export function TrainerBrandingForm({ tenant }: { tenant: Tenant }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(tenant.name);
  const [tagline, setTagline] = useState(tenant.tagline ?? "");
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url ?? "");
  const [accentColor, setAccentColor] = useState(tenant.accent_color ?? "#CCFF30");
  const [customDomain, setCustomDomain] = useState(tenant.custom_domain ?? "");

  function save() {
    startTransition(async () => {
      const res = await updateTenant({
        name,
        tagline,
        logoUrl,
        accentColor,
        customDomain,
      });
      if (res.ok) {
        toast("Branding saved.", "success");
      } else {
        toast(res.error ?? "Could not save", "error");
      }
    });
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

      <div className="rounded-xl bg-[var(--surface-secondary)] p-3 text-xs text-[var(--text-muted)]">
        <span className="font-medium text-[var(--text-secondary)]">Your portal slug:</span>{" "}
        {tenant.slug}
      </div>

      <Button onClick={save} disabled={pending} size="lg" className="w-full">
        {pending ? "Saving…" : "Save branding"}
      </Button>
    </div>
  );
}
