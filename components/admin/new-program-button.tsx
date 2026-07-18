"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createProgram } from "@/lib/actions/admin";

export function NewProgramButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await createProgram({ name, slug });
      if (res.ok && res.id) {
        toast("Draft program created.", "success");
        router.push(`/admin/programs/${res.id}`);
      } else {
        toast(res.error ?? "Could not create", "error");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>New program</Button>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
            <h3 className="text-lg font-bold">New program</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Creates a draft you can build out. It stays hidden until published.
            </p>
            <label className="mt-4 flex flex-col gap-1">
              <span className="text-sm">Name</span>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")
                  );
                }}
                className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
              />
            </label>
            <label className="mt-3 flex flex-col gap-1">
              <span className="text-sm">Slug</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 font-mono text-sm focus:border-[var(--border-active)] focus:outline-none"
              />
            </label>
            <div className="mt-5 flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={submit} disabled={pending || !name || !slug} className="flex-1">
                {pending ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
