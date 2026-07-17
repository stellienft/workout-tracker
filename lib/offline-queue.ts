"use client";

// Minimal offline-tolerant set-log queue. Logs are written to localStorage
// immediately (so a refresh or connectivity drop never loses a set) and
// flushed to the server when possible. Successful server writes clear the
// local entry.

import type { logSet } from "@/lib/actions/workout";

type LogInput = Parameters<typeof logSet>[0];

const KEY = "stellio_pending_sets";

function read(): (LogInput & { _k: string })[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(items: (LogInput & { _k: string })[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

function keyFor(i: LogInput) {
  return `${i.sessionId}:${i.exerciseId}:${i.setNumber}`;
}

export function enqueue(input: LogInput) {
  const items = read().filter((x) => x._k !== keyFor(input));
  items.push({ ...input, _k: keyFor(input) });
  write(items);
}

export function pendingCount(): number {
  return read().length;
}

/**
 * Flush queued logs through the provided server action. Entries that fail
 * (offline / server error) stay queued for the next attempt.
 */
export async function flush(
  action: (input: LogInput) => Promise<{ ok: boolean }>
): Promise<{ flushed: number; remaining: number }> {
  const items = read();
  const remaining: (LogInput & { _k: string })[] = [];
  let flushed = 0;
  for (const item of items) {
    const { _k, ...payload } = item;
    void _k;
    try {
      const res = await action(payload);
      if (res.ok) flushed++;
      else remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  write(remaining);
  return { flushed, remaining: remaining.length };
}
