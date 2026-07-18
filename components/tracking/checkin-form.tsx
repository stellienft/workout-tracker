"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ScaleInput } from "@/components/tracking/scale-input";
import { saveCheckin } from "@/lib/actions/tracking";

export function CheckinForm({
  existing,
}: {
  existing: {
    energy: number;
    soreness: number;
    sleepQuality: number;
    mood: number;
    shoulderPain: number;
    recovery: number;
  } | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [energy, setEnergy] = useState(existing?.energy ?? 3);
  const [soreness, setSoreness] = useState(existing?.soreness ?? 1);
  const [sleep, setSleep] = useState(existing?.sleepQuality ?? 3);
  const [mood, setMood] = useState(existing?.mood ?? 3);
  const [shoulder, setShoulder] = useState(existing?.shoulderPain ?? 0);
  const [recovery, setRecovery] = useState(existing?.recovery ?? 3);
  const [notes, setNotes] = useState("");

  function submit() {
    startTransition(async () => {
      const res = await saveCheckin({
        checkinType: "daily",
        energy,
        soreness,
        sleepQuality: sleep,
        mood,
        shoulderPain: shoulder,
        recovery,
        notes,
      });
      if (res.ok) {
        toast("Check-in saved.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Could not save", "error");
      }
    });
  }

  return (
    <div className="space-y-5 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      {existing && (
        <p className="rounded-xl bg-[var(--surface-secondary)] p-2 text-xs text-[var(--text-secondary)]">
          You already checked in today — updating will overwrite it.
        </p>
      )}
      <ScaleInput label="Energy" value={energy} onChange={setEnergy} />
      <ScaleInput label="Soreness" value={soreness} onChange={setSoreness} />
      <ScaleInput label="Sleep quality" value={sleep} onChange={setSleep} />
      <ScaleInput label="Mood" value={mood} onChange={setMood} />
      <ScaleInput label="Recovery" value={recovery} onChange={setRecovery} />
      <ScaleInput
        label="Left shoulder pain"
        value={shoulder}
        onChange={setShoulder}
        min={0}
        max={10}
        danger={shoulder >= 5}
        hint={shoulder >= 5 ? "Consider a lighter/recovery session" : "0 = none"}
      />
      <label className="block">
        <span className="text-sm font-medium">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything worth remembering?"
          className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>
      <Button onClick={submit} disabled={pending} size="lg" className="w-full">
        {pending ? "Saving…" : "Save check-in"}
      </Button>
    </div>
  );
}
