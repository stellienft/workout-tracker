"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { updateGoal } from "@/lib/actions/admin";
import type { FitnessGoal } from "@/lib/types";
import { ChevronDown } from "lucide-react";

export function GoalRow({ goal }: { goal: FitnessGoal }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(goal.name);
  const [shortDesc, setShortDesc] = useState(goal.short_description ?? "");
  const [longDesc, setLongDesc] = useState(goal.long_description ?? "");
  const [active, setActive] = useState(goal.active);

  function toggleActive() {
    const next = !active;
    setActive(next);
    startTransition(async () => {
      const res = await updateGoal(goal.id, { active: next });
      if (res.ok) toast(next ? "Goal activated." : "Goal hidden.", "success");
      else {
        setActive(!next);
        toast(res.error ?? "Could not update", "error");
      }
      router.refresh();
    });
  }

  function save() {
    startTransition(async () => {
      const res = await updateGoal(goal.id, {
        name,
        short_description: shortDesc,
        long_description: longDesc,
      });
      if (res.ok) {
        toast("Goal saved.", "success");
        router.refresh();
      } else toast(res.error ?? "Could not save", "error");
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
          <span className="font-medium">{goal.name}</span>
        </button>
        <button
          onClick={toggleActive}
          disabled={pending}
          className={`rounded-full px-3 py-1 text-xs ${
            active
              ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
              : "bg-[var(--surface-elevated)] text-[var(--text-muted)]"
          }`}
        >
          {active ? "Active" : "Hidden"}
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-[var(--border-subtle)] p-4">
          <input value={name} onChange={(e) => setName(e.target.value)} className={cls} />
          <input
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
            placeholder="Short description"
            className={cls}
          />
          <textarea
            value={longDesc}
            onChange={(e) => setLongDesc(e.target.value)}
            rows={3}
            placeholder="Long description"
            className={cls}
          />
          <Button onClick={save} disabled={pending} size="sm">
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

const cls =
  "w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2.5 text-sm focus:border-[var(--border-active)] focus:outline-none";
