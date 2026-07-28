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

  const { data: row, error } = await supabase
    .from("body_composition_scans")
    .upsert({
      user_id: user.id,
      scan_date: data.scanDate || new Date().toISOString().slice(0, 10),
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

  revalidatePath("/progress");
  return { ok: true as const, scanId: row.id as string };
}
