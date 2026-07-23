/**
 * Turn the structured insights into a short, human coaching note.
 *
 * The deterministic writer always works. If ANTHROPIC_API_KEY is configured,
 * `llmCoachNarrative` upgrades the prose using Claude — but it fails soft: any
 * error (no key, blocked egress, bad response) falls back to the deterministic
 * text, so the feature never depends on the network.
 */

import type { TrainingInsights } from "./analysis";

export function deterministicNarrative(insights: TrainingInsights): string {
  const { consistency, exercises, balance } = insights;
  const parts: string[] = [];

  parts.push(
    `You've logged ${consistency.completedSessions} sessions, averaging ` +
      `${consistency.avgPerWeek} a week. Consistency is the foundation — nice work.`
  );

  const progressing = exercises.filter((e) => e.trend === "progressing");
  const plateaued = exercises.filter((e) => e.trend === "plateaued");
  const regressing = exercises.filter((e) => e.trend === "regressing");

  if (progressing.length) {
    const names = progressing.slice(0, 3).map((e) => e.name).join(", ");
    parts.push(`Climbing: ${names}. Keep adding load while the reps hold.`);
  }
  if (plateaued.length) {
    const names = plateaued.slice(0, 3).map((e) => e.name).join(", ");
    parts.push(
      `Stalled: ${names}. Your plan deloads these ~10% so you can rebuild past the sticking point.`
    );
  }
  if (regressing.length) {
    const names = regressing.slice(0, 2).map((e) => e.name).join(", ");
    parts.push(`Slipping: ${names}. Prioritise sleep and food — the plan holds these steady.`);
  }

  if (balance.undertrained.length) {
    parts.push(
      `Under-trained lately: ${balance.undertrained.slice(0, 4).join(", ")}. ` +
        `The new split gives these more room.`
    );
  }

  parts.push(
    "Generate your adaptive plan below — it's built from your own numbers and updates as you keep logging."
  );

  return parts.join(" ");
}

/** Compact, serialisable summary handed to the LLM (keeps the prompt small). */
function summarise(insights: TrainingInsights) {
  return {
    sessions: insights.consistency.completedSessions,
    avgPerWeek: insights.consistency.avgPerWeek,
    lifts: insights.exercises.slice(0, 12).map((e) => ({
      name: e.name,
      trend: e.trend,
      bestEst1RM: e.bestEst1RM,
      change: e.percentChange,
    })),
    undertrained: insights.balance.undertrained.slice(0, 5),
    overtrained: insights.balance.overtrained.slice(0, 5),
  };
}

export async function llmCoachNarrative(
  insights: TrainingInsights
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return deterministicNarrative(insights);

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
        max_tokens: 320,
        system:
          "You are a strength coach. Given a member's training summary, write 3–4 short, " +
          "encouraging sentences: what's working, what's stalled and why the plan deloads it, " +
          "and one focus for the next block. Plain text, no lists, no markdown, no emojis.",
        messages: [
          {
            role: "user",
            content: `Training summary JSON:\n${JSON.stringify(summarise(insights))}`,
          },
        ],
      }),
      // Don't let a slow API hang the page.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return deterministicNarrative(insights);
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = data.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text)
      .join(" ")
      .trim();
    return text && text.length > 0 ? text : deterministicNarrative(insights);
  } catch {
    return deterministicNarrative(insights);
  }
}
