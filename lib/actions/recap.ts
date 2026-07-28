"use server";

import { getAuthContext } from "@/lib/auth";
import { computeStreak } from "@/lib/streak";

const DAY = 86_400_000;

/** Monday (local-ish, UTC-based) of the week containing `d`, as YYYY-MM-DD. */
function weekStart(d = new Date()): string {
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

export interface WeeklyRecap {
  summary: string;
  focus: string | null;
  stats: Record<string, unknown>;
  weekStart: string;
}

/** Returns this week's cached recap, or null if not generated yet. */
export async function getCachedRecap(): Promise<WeeklyRecap | null> {
  const { user, supabase } = await getAuthContext();
  if (!user) return null;
  const { data } = await supabase
    .from("weekly_recaps")
    .select("summary, focus, stats, week_start")
    .eq("user_id", user.id)
    .eq("week_start", weekStart())
    .maybeSingle();
  if (!data) return null;
  return {
    summary: data.summary as string,
    focus: (data.focus as string | null) ?? null,
    stats: (data.stats as Record<string, unknown>) ?? {},
    weekStart: data.week_start as string,
  };
}

/**
 * Generate (and cache) this week's recap from the member's last 7 days of
 * training. Returns the cached one if it already exists. Gated to members with
 * at least a couple of sessions so there's something to recap.
 */
export async function generateWeeklyRecap(): Promise<
  { ok: true; recap: WeeklyRecap } | { ok: false; error: string }
> {
  const existing = await getCachedRecap();
  if (existing) return { ok: true, recap: existing };

  const { user, profile, supabase } = await getAuthContext();
  if (!user) return { ok: false, error: "Not authenticated" };

  const tz = (profile?.timezone as string) || "Australia/Brisbane";
  const since = new Date(Date.now() - 7 * DAY).toISOString();
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();

  const [{ data: sessions }, { data: logs }, { data: metrics }, { data: checkins }] =
    await Promise.all([
      supabase
        .from("workout_sessions")
        .select("id, completed_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("completed_at", since30),
      supabase
        .from("set_logs")
        .select("exercise_id, weight_kg, reps, completed, created_at")
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("created_at", since),
      supabase
        .from("body_metrics")
        .select("weight_kg, recorded_on")
        .eq("user_id", user.id)
        .not("weight_kg", "is", null)
        .order("recorded_on", { ascending: false })
        .limit(10),
      supabase
        .from("checkins")
        .select("energy, soreness, recovery, checked_on")
        .eq("user_id", user.id)
        .gte("checked_on", weekStart()),
    ]);

  const allDates = (sessions ?? []).map((s) => s.completed_at as string);
  const sessions7 = allDates.filter((d) => Date.now() - new Date(d).getTime() <= 7 * DAY).length;
  if (sessions7 < 2) {
    return { ok: false, error: "Not enough training this week to recap yet — aim for a couple of sessions." };
  }

  const streak = computeStreak(allDates, tz);
  const setCount = (logs ?? []).length;
  const totalVolume = Math.round(
    (logs ?? []).reduce((s, l) => s + Number(l.weight_kg ?? 0) * Number(l.reps ?? 0), 0)
  );
  const target = (profile?.weekly_frequency as number | null) ?? null;

  // Weight change over the recent readings.
  const weights = (metrics ?? []).map((m) => Number(m.weight_kg));
  const weightChange =
    weights.length >= 2 ? Number((weights[0] - weights[weights.length - 1]).toFixed(1)) : null;

  const avg = (arr: (number | null)[]) => {
    const nums = arr.filter((n): n is number => n != null);
    return nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)) : null;
  };
  const energy = avg((checkins ?? []).map((c) => c.energy as number | null));
  const soreness = avg((checkins ?? []).map((c) => c.soreness as number | null));

  const stats: Record<string, unknown> = {
    sessions7,
    target,
    streak: streak.current,
    setCount,
    totalVolume,
    weightChange,
    avgEnergy: energy,
    avgSoreness: soreness,
  };

  const summaryFallback = `You trained ${sessions7} time${sessions7 === 1 ? "" : "s"} this week${
    target ? ` (goal ${target})` : ""
  }, logging ${setCount} sets for ${totalVolume.toLocaleString()} kg of volume${
    streak.current ? `, on a ${streak.current}-day streak` : ""
  }.`;

  let summary = summaryFallback;
  let focus: string | null = null;

  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system:
            "You are an upbeat, concise fitness coach writing a member's weekly recap. " +
            "Given their week's training stats as JSON, reply ONLY with valid JSON: " +
            '{"summary": string, "focus": string}. ' +
            "summary: 2-3 warm sentences celebrating what they did and their consistency/habit. " +
            "focus: one specific, encouraging suggestion for next week. No markdown.",
          messages: [{ role: "user", content: JSON.stringify(stats) }],
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const data = (await res.json()) as { content?: { type: string; text?: string }[] };
        const text = data.content?.filter((c) => c.type === "text").map((c) => c.text).join(" ").trim();
        const match = text?.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as { summary?: string; focus?: string };
          if (parsed.summary) summary = parsed.summary;
          if (parsed.focus) focus = parsed.focus;
        }
      }
    } catch {
      // Fall back to the templated summary.
    }
  }

  const ws = weekStart();
  // Cache it (ignore a race where another request inserted first).
  await supabase
    .from("weekly_recaps")
    .upsert(
      { user_id: user.id, week_start: ws, summary, focus, stats },
      { onConflict: "user_id,week_start" }
    );

  return { ok: true, recap: { summary, focus, stats, weekStart: ws } };
}
