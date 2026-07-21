"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { completeTrainerSetup } from "@/lib/actions/trainer";
import { Dumbbell, Palette, ImageIcon } from "lucide-react";

const ACCENTS = [
  "#ccff30",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#ef4444",
];

export function TrainerSetupWizard({
  name,
  initial,
}: {
  name: string;
  initial: {
    businessName: string;
    tagline: string;
    accentColor: string;
    logoUrl: string;
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState(initial.businessName);
  const [tagline, setTagline] = useState(initial.tagline);
  const [accentColor, setAccentColor] = useState(initial.accentColor);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);

  const totalSteps = 3;
  const firstName = name ? name.split(" ")[0] : "";

  async function finish() {
    if (businessName.trim().length < 2) {
      setError("Please add a business name.");
      setStep(0);
      return;
    }
    setSaving(true);
    setError(null);
    const res = await completeTrainerSetup({
      name: businessName.trim(),
      tagline: tagline.trim(),
      accentColor,
      logoUrl: logoUrl.trim(),
    });
    if (res.ok) {
      router.push("/trainer");
      router.refresh();
    } else {
      setError(res.error ?? "Could not save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= step
                ? "bg-[var(--accent-primary)]"
                : "bg-[var(--surface-elevated)]"
            )}
          />
        ))}
      </div>

      <div className="flex-1">
        {step === 0 && (
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-muted)]">
              <Dumbbell className="h-6 w-6 text-[var(--accent-primary)]" />
            </div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">
              Welcome{firstName ? `, ${firstName}` : ""} — let&apos;s set up your
              coaching business
            </h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              This is your white-label portal. Start with your business name —
              it&apos;s what your clients will see.
            </p>
            <label className="mt-6 flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Business name
              </span>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Peak Performance Coaching"
                className="h-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 text-white placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
              />
            </label>
            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Tagline (optional)
              </span>
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Stronger every week"
                className="h-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 text-white placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-muted)]">
              <Palette className="h-6 w-6 text-[var(--accent-primary)]" />
            </div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">
              Pick your brand colour
            </h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Used for buttons, highlights and links across your portal.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {ACCENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAccentColor(a)}
                  aria-label={a}
                  className={cn(
                    "h-10 w-10 rounded-full ring-2 ring-offset-2 ring-offset-[var(--background-primary)] transition-transform hover:scale-105",
                    accentColor.toLowerCase() === a ? "ring-white" : "ring-transparent"
                  )}
                  style={{ backgroundColor: a }}
                />
              ))}
              <label
                className="relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[var(--border-subtle)]"
                title="Custom colour"
                style={{
                  background:
                    "conic-gradient(red, orange, yellow, lime, cyan, blue, magenta, red)",
                }}
              >
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
            <div
              className="mt-8 rounded-2xl border border-[var(--border-subtle)] p-5"
              style={{ background: "var(--surface-primary)" }}
            >
              <p className="text-sm text-[var(--text-secondary)]">Preview</p>
              <p className="mt-1 text-lg font-bold">
                {businessName || "Your business"}
              </p>
              {tagline && (
                <p className="text-sm text-[var(--text-secondary)]">{tagline}</p>
              )}
              <span
                className="mt-3 inline-block rounded-xl px-4 py-2 text-sm font-semibold text-black"
                style={{ backgroundColor: accentColor }}
              >
                Start training
              </span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-muted)]">
              <ImageIcon className="h-6 w-6 text-[var(--accent-primary)]" />
            </div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">
              Add your logo (optional)
            </h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Paste a link to your logo. You can skip this and add it later in
              the portal, along with programs, videos and clients.
            </p>
            <label className="mt-6 flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Logo URL
              </span>
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://… (PNG or SVG, transparent background)"
                className="h-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 text-white placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
              />
            </label>
            <div className="mt-6 rounded-2xl bg-[var(--surface-secondary)] p-4 text-sm text-[var(--text-secondary)]">
              After setup you&apos;ll be able to build custom programs, upload
              videos, invite clients, and chat with them — all from your portal.
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || saving}
        >
          Back
        </Button>
        {step < totalSteps - 1 ? (
          <Button
            onClick={() => {
              if (step === 0 && businessName.trim().length < 2) {
                setError("Please add a business name to continue.");
                return;
              }
              setError(null);
              setStep((s) => s + 1);
            }}
          >
            Continue
          </Button>
        ) : (
          <Button onClick={finish} disabled={saving}>
            {saving ? "Setting up…" : "Enter my portal"}
          </Button>
        )}
      </div>
    </div>
  );
}
