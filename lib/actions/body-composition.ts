"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/entitlements";

// ============================================================
// Types
// ============================================================

export interface ParsedScanData {
  scanDate?: string;
  source?: "inbody" | "dexa" | "evolt" | "other";
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

export interface ParseScanResult {
  ok: boolean;
  data?: ParsedScanData;
  error?: string;
}

export interface SaveScanInput {
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
}

export interface SaveScanResult {
  ok: boolean;
  error?: string;
  scanId?: string;
}

// ============================================================
// parseScanResult — use Claude to extract structured data from
// raw OCR / pasted scan text.
// ============================================================

const SCAN_SYSTEM_PROMPT =
  "You are a fitness data extraction assistant. Extract body composition metrics from the scan results text. " +
  "Return ONLY valid JSON with these fields: scanDate (YYYY-MM-DD), source (inbody/dexa/evolt/other), " +
  "weightKg, bodyFatPct, muscleMassKg, waterPct, bmr, bmi, visceralFat, boneMassKg, proteinKg, " +
  "leftArmMass, rightArmMass, trunkMass, leftLegMass, rightLegMass. " +
  "Use null for fields not found. Do not include markdown or explanation.";

export async function parseScanResult(scanText: string): Promise<ParseScanResult> {
  const { isPro } = await getUserPlan();
  if (!isPro) return { ok: false, error: "Body composition scanning is a Pro feature." };

  if (!scanText || scanText.trim().length === 0) {
    return { ok: false, error: "No scan text provided." };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { ok: false, error: "AI parsing is not configured. Please try again later." };
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
        system: SCAN_SYSTEM_PROMPT,
        messages: [{ role: "user", content: scanText }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return { ok: false, error: "Could not reach the AI parser. Please try again." };
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = data.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text)
      .join(" ")
      .trim();

    if (!text) {
      return { ok: false, error: "No response from the AI parser." };
    }

    // Extract JSON from the response (handles cases where Claude wraps in prose)
    let parsed: Record<string, unknown>;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { ok: false, error: "Could not parse scan data. Please try again or enter manually." };
    }

    // Coerce nulls to undefined and validate source
    const toNum = (v: unknown): number | undefined =>
      v === null || v === undefined || v === "" ? undefined : typeof v === "number" ? v : Number(v);
    const numVal = (v: unknown) => {
      const n = toNum(v);
      return n !== undefined && !isNaN(n) ? n : undefined;
    };

    const validSources = ["inbody", "dexa", "evolt", "other"] as const;
    const rawSource = parsed.source as string | undefined;
    const source = rawSource && validSources.includes(rawSource as (typeof validSources)[number])
      ? (rawSource as ParsedScanData["source"])
      : undefined;

    const result: ParsedScanData = {
      scanDate: (parsed.scanDate as string) || undefined,
      source,
      weightKg: numVal(parsed.weightKg),
      bodyFatPct: numVal(parsed.bodyFatPct),
      muscleMassKg: numVal(parsed.muscleMassKg),
      waterPct: numVal(parsed.waterPct),
      bmr: numVal(parsed.bmr) !== undefined ? Math.round(numVal(parsed.bmr)!) : undefined,
      bmi: numVal(parsed.bmi),
      visceralFat: numVal(parsed.visceralFat),
      boneMassKg: numVal(parsed.boneMassKg),
      proteinKg: numVal(parsed.proteinKg),
      leftArmMass: numVal(parsed.leftArmMass),
      rightArmMass: numVal(parsed.rightArmMass),
      trunkMass: numVal(parsed.trunkMass),
      leftLegMass: numVal(parsed.leftLegMass),
      rightLegMass: numVal(parsed.rightLegMass),
    };

    return { ok: true, data: result };
  } catch {
    return { ok: false, error: "The AI parser is busy. Please try again." };
  }
}

// ============================================================
// saveScanResult — persist a parsed (or manually entered) scan
// to the body_composition_scans table.
// ============================================================

export async function saveScanResult(data: SaveScanInput): Promise<SaveScanResult> {
  const { isPro } = await getUserPlan();
  if (!isPro) return { ok: false, error: "Body composition scanning is a Pro feature." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Validate scan image path belongs to the user (defence in depth)
  if (data.scanImagePath && !data.scanImagePath.startsWith(`${user.id}/`)) {
    return { ok: false, error: "Invalid upload path." };
  }

  const validSources = ["inbody", "dexa", "evolt", "other"];
  const source =
    data.source && validSources.includes(data.source) ? data.source : null;

  const insertData = {
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
  };

  const { data: row, error } = await supabase
    .from("body_composition_scans")
    .upsert(insertData, { onConflict: "user_id,scan_date" })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Could not save scan." };
  }

  revalidatePath("/progress");
  revalidatePath("/profile");
  return { ok: true, scanId: row.id as string };
}
