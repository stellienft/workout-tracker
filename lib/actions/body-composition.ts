"use server";

import { revalidatePath } from "next/cache";

export interface ParsedScanData {
  scanDate?: string;
  source?: string;
  weightKg?: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  waterPct?: number;
  bmr?: number;
  bmi?: number;
  visceralFat?: number;
  boneMassKg?: number;
  proteinKg?: number;
  leftArmMass?: number;
  rightArmMass?: number;
  trunkMass?: number;
  leftLegMass?: number;
  rightLegMass?: number;
}

const EXTRACT_SYSTEM =
  "You are a fitness data extraction assistant. Extract body composition metrics from the scan " +
  "(which may be provided as text, an image, or a PDF). " +
  "Return ONLY valid JSON with these fields: scanDate (YYYY-MM-DD), source (inbody/dexa/evolt/other), " +
  "weightKg, bodyFatPct, muscleMassKg, waterPct, bmr, bmi, visceralFat, boneMassKg, proteinKg, " +
  "leftArmMass, rightArmMass, trunkMass, leftLegMass, rightLegMass. " +
  "Use null for fields not found. No markdown or explanation.";

/** Send content blocks to Claude and map the returned JSON to ParsedScanData. */
async function extractMetrics(content: unknown[]) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { ok: false as const, error: "AI parsing is not configured." };
  }

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
        max_tokens: 1000,
        system: EXTRACT_SYSTEM,
        messages: [{ role: "user", content }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return { ok: false as const, error: "Could not reach AI parser." };

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.filter((c) => c.type === "text").map((c) => c.text).join(" ").trim();
    if (!text) return { ok: false as const, error: "No response from AI parser." };

    let parsed: Record<string, unknown>;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { ok: false as const, error: "Could not read the scan. Try a clearer image, or paste the text." };
    }

    const num = (v: unknown): number | undefined => {
      if (v === null || v === undefined || v === "") return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return !isNaN(n) ? n : undefined;
    };

    const result: ParsedScanData = {
      scanDate: (parsed.scanDate as string) || undefined,
      source: (parsed.source as string) || undefined,
      weightKg: num(parsed.weightKg),
      bodyFatPct: num(parsed.bodyFatPct),
      muscleMassKg: num(parsed.muscleMassKg),
      waterPct: num(parsed.waterPct),
      bmr: num(parsed.bmr) !== undefined ? Math.round(num(parsed.bmr)!) : undefined,
      bmi: num(parsed.bmi),
      visceralFat: num(parsed.visceralFat),
      boneMassKg: num(parsed.boneMassKg),
      proteinKg: num(parsed.proteinKg),
      leftArmMass: num(parsed.leftArmMass),
      rightArmMass: num(parsed.rightArmMass),
      trunkMass: num(parsed.trunkMass),
      leftLegMass: num(parsed.leftLegMass),
      rightLegMass: num(parsed.rightLegMass),
    };

    const hasAny = Object.values(result).some((v) => v !== undefined);
    if (!hasAny) {
      return { ok: false as const, error: "No body-composition data found in that file." };
    }

    return { ok: true as const, data: result };
  } catch {
    return { ok: false as const, error: "AI parser is busy. Please try again." };
  }
}

/** Parse metrics from pasted scan-results text. */
export async function parseScanResult(scanText: string) {
  if (!scanText || scanText.trim().length === 0) {
    return { ok: false as const, error: "No scan text provided." };
  }
  return extractMetrics([{ type: "text", text: scanText.trim() }]);
}

/**
 * Parse metrics directly from an uploaded scan file (image or PDF) that the
 * browser already stored in the private body-scans bucket. The file is read
 * server-side and passed to Claude's vision/document parsing, so a member can
 * just upload their scan without also pasting the text.
 */
export async function parseScanImage(storagePath: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false as const, error: "AI parsing is not configured." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  if (!storagePath.startsWith(`${user.id}/`)) {
    return { ok: false as const, error: "Invalid upload path." };
  }

  const { data: file, error: dlErr } = await supabase.storage
    .from("body-scans")
    .download(storagePath);
  if (dlErr || !file) return { ok: false as const, error: "Could not read the uploaded file." };

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const isPdf =
    file.type === "application/pdf" || storagePath.toLowerCase().endsWith(".pdf");

  const fileBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: file.type || "image/jpeg",
          data: base64,
        },
      };

  return extractMetrics([
    fileBlock,
    { type: "text", text: "Extract the body composition metrics from this scan." },
  ]);
}

export async function saveScanResult(data: {
  scanDate?: string;
  source?: string;
  weightKg?: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  waterPct?: number;
  bmr?: number;
  bmi?: number;
  visceralFat?: number;
  boneMassKg?: number;
  proteinKg?: number;
  leftArmMass?: number;
  rightArmMass?: number;
  trunkMass?: number;
  leftLegMass?: number;
  rightLegMass?: number;
  rawText?: string;
  scanImagePath?: string;
}) {
  const { createClient } = await import("@/lib/supabase/server");
  const { getUserPlan } = await import("@/lib/entitlements");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { isPro } = await getUserPlan();
  if (!isPro) return { ok: false as const, error: "Body composition scanning is a Pro feature." };

  if (data.scanImagePath && !data.scanImagePath.startsWith(`${user.id}/`)) {
    return { ok: false as const, error: "Invalid upload path." };
  }

  const validSources = ["inbody", "dexa", "evolt", "other"];
  const source = data.source && validSources.includes(data.source) ? data.source : null;

  // AI may return an odd/blank date — only trust a strict YYYY-MM-DD, else today.
  const today = new Date().toISOString().slice(0, 10);
  const scanDate = /^\d{4}-\d{2}-\d{2}$/.test(data.scanDate ?? "")
    ? (data.scanDate as string)
    : today;

  const { data: row, error } = await supabase
    .from("body_composition_scans")
    .upsert({
      user_id: user.id,
      scan_date: scanDate,
      source,
      weight_kg: data.weightKg ?? null,
      body_fat_pct: data.bodyFatPct ?? null,
      muscle_mass_kg: data.muscleMassKg ?? null,
      water_pct: data.waterPct ?? null,
      basal_metabolic_rate: data.bmr ?? null,
      bmi: data.bmi ?? null,
      visceral_fat_level: data.visceralFat ?? null,
      bone_mass_kg: data.boneMassKg ?? null,
      protein_kg: data.proteinKg ?? null,
      left_arm_mass_kg: data.leftArmMass ?? null,
      right_arm_mass_kg: data.rightArmMass ?? null,
      trunk_mass_kg: data.trunkMass ?? null,
      left_leg_mass_kg: data.leftLegMass ?? null,
      right_leg_mass_kg: data.rightLegMass ?? null,
      raw_text: data.rawText ?? null,
      scan_image_path: data.scanImagePath ?? null,
    }, { onConflict: "user_id,scan_date" })
    .select("id")
    .single();

  if (error || !row) return { ok: false as const, error: error?.message ?? "Could not save scan." };

  // Mirror the scan weight into body_metrics so it flows to the dashboard and
  // weight graph. Merge into any existing row for that date so we don't wipe
  // measurements already logged (body_metrics upsert would replace the row).
  if (data.weightKg != null) {
    const { data: existing } = await supabase
      .from("body_metrics")
      .select("id")
      .eq("user_id", user.id)
      .eq("recorded_on", scanDate)
      .maybeSingle();
    if (existing) {
      await supabase.from("body_metrics").update({ weight_kg: data.weightKg }).eq("id", existing.id as string);
    } else {
      await supabase
        .from("body_metrics")
        .insert({ user_id: user.id, recorded_on: scanDate, weight_kg: data.weightKg });
    }
  }

  revalidatePath("/progress");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { ok: true as const, scanId: row.id as string };
}

export interface ScanPlan {
  headline: string;
  summary: string;
  priorities: { title: string; detail: string }[];
  split: string;
  cardio: string;
  nutrition: string;
  flags: string[];
}

const PLAN_SYSTEM =
  "You are a strength and physique coach. Given a body-composition scan (DEXA or InBody) " +
  "and any change since the member's previous scan, produce a focused training plan that " +
  "targets what the report actually shows. Read the real numbers — regional lean/fat " +
  "asymmetry (left vs right arm/leg), body-fat %, visceral fat, and lean-mass trend. " +
  "Return ONLY valid JSON with these fields: headline (<= 8 words), summary (1-2 sentences " +
  "reading the report), priorities (array of 2-4 objects {title, detail}), split (one " +
  "recommended weekly training split with a short rationale), cardio (one sentence of " +
  "guidance), nutrition (one sentence tied to the member's goal), flags (array of short " +
  "strings for imbalances or health watch-items; may be empty). Be specific and practical. " +
  "No markdown, no preamble.";

function scanMetricsText(
  scan: Record<string, unknown>,
  prev: Record<string, unknown> | null,
  ctx: { goal?: string | null; level?: string | null; goalWeight?: number | null }
): string {
  const n = (v: unknown) => (v == null ? null : Number(v));
  const rows: string[] = [];
  const add = (label: string, key: string, unit = "") => {
    const cur = n(scan[key]);
    if (cur == null) return;
    const before = prev ? n(prev[key]) : null;
    const delta =
      before != null ? ` (was ${before}${unit}, ${cur - before >= 0 ? "+" : ""}${Math.round((cur - before) * 10) / 10}${unit})` : "";
    rows.push(`- ${label}: ${cur}${unit}${delta}`);
  };
  add("Weight", "weight_kg", "kg");
  add("Body fat", "body_fat_pct", "%");
  add("Muscle/lean mass", "muscle_mass_kg", "kg");
  add("Visceral fat level", "visceral_fat_level");
  add("BMR", "basal_metabolic_rate", " kcal");
  add("BMI", "bmi");
  add("Protein", "protein_kg", "kg");
  add("Left arm lean", "left_arm_mass_kg", "kg");
  add("Right arm lean", "right_arm_mass_kg", "kg");
  add("Trunk lean", "trunk_mass_kg", "kg");
  add("Left leg lean", "left_leg_mass_kg", "kg");
  add("Right leg lean", "right_leg_mass_kg", "kg");
  const meta = [
    ctx.goal ? `Goal: ${ctx.goal}` : null,
    ctx.level ? `Experience: ${ctx.level}` : null,
    ctx.goalWeight ? `Target weight: ${ctx.goalWeight}kg` : null,
    scan.source ? `Scan type: ${String(scan.source).toUpperCase()}` : null,
    prev ? "This is a follow-up scan; deltas are vs the previous one." : "This is the first scan on record.",
  ]
    .filter(Boolean)
    .join(". ");
  return `${meta}\n\nMetrics:\n${rows.join("\n")}`;
}

/**
 * Read a saved body-composition scan with Claude and produce a training focus
 * tailored to what the report shows (imbalances, body fat, lean-mass trend).
 * The plan is stored on the scan so it persists. Pro-gated.
 */
export async function generateScanPlan(
  scanId: string
): Promise<{ ok: true; plan: ScanPlan } | { ok: false; error: string }> {
  const { createClient } = await import("@/lib/supabase/server");
  const { getUserPlan } = await import("@/lib/entitlements");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { isPro } = await getUserPlan();
  if (!isPro) return { ok: false as const, error: "AI scan plans are a Pro feature." };

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false as const, error: "AI plans aren't configured yet." };

  const { data: scan } = await supabase
    .from("body_composition_scans")
    .select("*")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!scan) return { ok: false as const, error: "Scan not found." };

  const { data: prev } = await supabase
    .from("body_composition_scans")
    .select("*")
    .eq("user_id", user.id)
    .lt("scan_date", scan.scan_date as string)
    .order("scan_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: profile }, { data: goalRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select("experience_level, goal_weight_kg")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_goals")
      .select("fitness_goals(name)")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .maybeSingle(),
  ]);
  const fg = goalRow?.fitness_goals as
    | { name?: string }
    | { name?: string }[]
    | null
    | undefined;
  const goalName = Array.isArray(fg) ? fg[0]?.name : fg?.name;

  const text = scanMetricsText(
    scan as Record<string, unknown>,
    (prev as Record<string, unknown>) ?? null,
    {
      goal: goalName ?? null,
      level: (profile?.experience_level as string) ?? null,
      goalWeight: (profile?.goal_weight_kg as number) ?? null,
    }
  );

  let parsed: Record<string, unknown>;
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
        max_tokens: 900,
        system: PLAN_SYSTEM,
        messages: [{ role: "user", content: text }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return { ok: false as const, error: "Couldn't reach the AI coach." };
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const out = data.content?.filter((c) => c.type === "text").map((c) => c.text).join(" ").trim();
    if (!out) return { ok: false as const, error: "No response from the AI coach." };
    const jm = out.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jm ? jm[0] : out);
  } catch {
    return { ok: false as const, error: "The AI coach is busy. Please try again." };
  }

  const str = (v: unknown, max = 400) => (v == null ? "" : String(v).slice(0, max));
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const plan: ScanPlan = {
    headline: str(parsed.headline, 80) || "Your training focus",
    summary: str(parsed.summary, 400),
    priorities: arr(parsed.priorities)
      .slice(0, 4)
      .map((p) => {
        const o = (p ?? {}) as Record<string, unknown>;
        return { title: str(o.title, 80), detail: str(o.detail, 300) };
      })
      .filter((p) => p.title),
    split: str(parsed.split, 400),
    cardio: str(parsed.cardio, 300),
    nutrition: str(parsed.nutrition, 300),
    flags: arr(parsed.flags).slice(0, 6).map((f) => str(f, 140)).filter(Boolean),
  };

  await supabase
    .from("body_composition_scans")
    .update({ ai_plan: plan, ai_plan_generated_at: new Date().toISOString() })
    .eq("id", scanId)
    .eq("user_id", user.id);

  revalidatePath("/progress");
  return { ok: true as const, plan };
}
