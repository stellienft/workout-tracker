"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Archive, Package as PackageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  createTrainerPackage,
  setPackageArchived,
} from "@/lib/actions/packages";

export interface PackageRow {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: "monthly" | "weekly" | "one_off";
  features: string[];
  status: "active" | "archived";
}

const INTERVAL_LABEL: Record<PackageRow["interval"], string> = {
  monthly: "/mo",
  weekly: "/wk",
  one_off: " one-off",
};

export function money(cents: number, currency = "aud") {
  const symbol = currency.toLowerCase() === "usd" ? "$" : "$";
  const amount = cents / 100;
  return `${symbol}${amount % 1 ? amount.toFixed(2) : amount.toFixed(0)}`;
}

export function TrainerPackages({ packages }: { packages: PackageRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(packages.length === 0);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [interval, setInterval] = useState<PackageRow["interval"]>("monthly");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");

  function create() {
    if (name.trim().length < 2) {
      toast("Name your package.", "error");
      return;
    }
    startTransition(async () => {
      const res = await createTrainerPackage({
        name: name.trim(),
        description: description.trim() || undefined,
        priceCents: Math.round((Number(price) || 0) * 100),
        interval,
        features: features
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean),
      });
      if (res.ok) {
        toast("Package created.", "success");
        setName("");
        setPrice("");
        setDescription("");
        setFeatures("");
        setOpen(false);
        router.refresh();
      } else {
        toast(res.error ?? "Could not create", "error");
      }
    });
  }

  function toggleArchive(p: PackageRow) {
    startTransition(async () => {
      const res = await setPackageArchived(p.id, p.status !== "archived");
      if (res.ok) router.refresh();
      else toast(res.error ?? "Failed", "error");
    });
  }

  return (
    <div className="space-y-6">
      {!open && (
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New package
        </Button>
      )}

      {open && (
        <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <p className="font-semibold">New package</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Package name (e.g. 1:1 Online Coaching)"
              className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="Price"
                className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
              />
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value as PackageRow["interval"])}
                className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2 text-sm"
              >
                <option value="monthly">/ month</option>
                <option value="weekly">/ week</option>
                <option value="one_off">one-off</option>
              </select>
            </div>
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <textarea
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder={"What's included — one per line\ne.g. Weekly check-ins\nCustom program\nForm reviews"}
            rows={4}
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <div className="flex gap-2">
            <Button onClick={create} disabled={pending}>
              {pending ? "Saving…" : "Create package"}
            </Button>
            {packages.length > 0 && (
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {packages.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          No packages yet. Create one above, then assign it to a client from your
          Clients page.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {packages.map((p) => (
            <div
              key={p.id}
              className={`rounded-[var(--radius-card)] border p-5 ${
                p.status === "archived"
                  ? "border-[var(--border-subtle)] bg-[var(--surface-secondary)] opacity-60"
                  : "border-[var(--border-subtle)] bg-[var(--surface-primary)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PackageIcon className="h-4 w-4 text-[var(--accent-primary)]" />
                  <p className="font-semibold">{p.name}</p>
                </div>
                <span className="text-lg font-extrabold">
                  {money(p.price_cents, p.currency)}
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    {INTERVAL_LABEL[p.interval]}
                  </span>
                </span>
              </div>
              {p.description && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{p.description}</p>
              )}
              {p.features.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
                  {p.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => toggleArchive(p)}
                disabled={pending}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                <Archive className="h-3.5 w-3.5" />
                {p.status === "archived" ? "Restore" : "Archive"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
