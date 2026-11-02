import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Insulin-resistance / metabolic-health tracking.
//
// Members log lab markers (fasting glucose + insulin, HbA1c, triglycerides,
// HDL) and waist as a set per blood draw. From those we derive the common
// at-home insulin-resistance proxies — HOMA-IR, TG:HDL ratio, waist-to-height
// — and classify each against GENERAL reference ranges. Units are mmol/L
// (Australia/UK). This is educational tracking, not a diagnosis.
// ---------------------------------------------------------------------------

export interface MetabolicEntry {
  id: string;
  recorded_on: string;
  fasting_glucose_mmol: number | null;
  fasting_insulin_uu: number | null;
  hba1c_pct: number | null;
  triglycerides_mmol: number | null;
  hdl_mmol: number | null;
  waist_cm: number | null;
  notes: string | null;
}

export type BandStatus = "good" | "watch" | "high" | "unknown";

export interface Reading {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  /** Short decimal format for display. */
  display: string;
  status: BandStatus;
  /** One-line interpretation of the band. */
  note: string;
  recordedOn: string | null;
}

export interface MetabolicData {
  entries: MetabolicEntry[];
  latestOn: string | null;
  readings: Reading[];
  /** Per-key time series (oldest→newest) for trend charts. */
  series: Record<string, { x: string; y: number }[]>;
  heightCm: number | null;
  remindersEnabled: boolean;
}

export const HOMA_DIVISOR = 22.5; // mmol/L form: glucose × insulin / 22.5

function classifyLowerIsBetter(
  v: number | null,
  goodMax: number,
  watchMax: number,
): BandStatus {
  if (v == null || Number.isNaN(v)) return "unknown";
  if (v < goodMax) return "good";
  if (v < watchMax) return "watch";
  return "high";
}

function fmt(v: number | null, dp = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toFixed(dp);
}

/** Most recent non-null value of a field across entries (newest first scan). */
function latest(
  entries: MetabolicEntry[],
  pick: (e: MetabolicEntry) => number | null,
): { value: number | null; on: string | null } {
  for (const e of entries) {
    const v = pick(e);
    if (v != null) return { value: v, on: e.recorded_on };
  }
  return { value: null, on: null };
}

/** Most recent entry where BOTH fields are present (for paired indices). */
function latestPair(
  entries: MetabolicEntry[],
  a: (e: MetabolicEntry) => number | null,
  b: (e: MetabolicEntry) => number | null,
): { a: number; b: number; on: string } | null {
  for (const e of entries) {
    const av = a(e);
    const bv = b(e);
    if (av != null && bv != null) return { a: av, b: bv, on: e.recorded_on };
  }
  return null;
}

function series(
  entriesAsc: MetabolicEntry[],
  pick: (e: MetabolicEntry) => number | null,
): { x: string; y: number }[] {
  return entriesAsc
    .map((e) => ({ x: e.recorded_on, y: pick(e) }))
    .filter((p): p is { x: string; y: number } => p.y != null && !Number.isNaN(p.y));
}

const NOTE: Record<BandStatus, Record<string, string>> = {
  good: {
    homa_ir: "Healthy insulin sensitivity.",
    glucose: "Normal fasting glucose.",
    hba1c: "Normal range.",
    insulin: "Low fasting insulin — a good sign.",
    tg_hdl: "Low ratio — favourable.",
    waist_height: "Healthy waist-to-height.",
  },
  watch: {
    homa_ir: "Early insulin resistance — worth addressing.",
    glucose: "Impaired fasting glucose (pre-diabetes range).",
    hba1c: "Pre-diabetes range.",
    insulin: "Borderline-high fasting insulin.",
    tg_hdl: "Borderline ratio.",
    waist_height: "Increased central fat.",
  },
  high: {
    homa_ir: "Significant insulin resistance — discuss with your doctor.",
    glucose: "Diabetes range — please see your doctor.",
    hba1c: "Diabetes range — please see your doctor.",
    insulin: "High fasting insulin.",
    tg_hdl: "High ratio — linked to insulin resistance.",
    waist_height: "High central fat — a key risk factor.",
  },
  unknown: {
    homa_ir: "Log fasting glucose + insulin to calculate.",
    glucose: "Not logged yet.",
    hba1c: "Not logged yet.",
    insulin: "Not logged yet.",
    tg_hdl: "Log triglycerides + HDL to calculate.",
    waist_height: "Add your height + waist to calculate.",
  },
};

export async function getMetabolicData(userId: string): Promise<MetabolicData> {
  const supabase = await createClient();

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("metabolic_markers")
      .select("*")
      .eq("user_id", userId)
      .order("recorded_on", { ascending: false })
      .limit(500),
    supabase
      .from("profiles")
      .select("height_cm, metabolic_reminders_enabled")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const entries = (rows ?? []) as MetabolicEntry[]; // newest first
  const asc = [...entries].reverse();
  const heightCm = (profile?.height_cm as number | null) ?? null;

  // Paired indices from the most recent draw that has both components.
  const homaPair = latestPair(
    entries,
    (e) => e.fasting_glucose_mmol,
    (e) => e.fasting_insulin_uu,
  );
  const homaIr = homaPair ? homaPair.a * homaPair.b / HOMA_DIVISOR : null;

  const tgPair = latestPair(
    entries,
    (e) => e.triglycerides_mmol,
    (e) => (e.hdl_mmol && e.hdl_mmol > 0 ? e.hdl_mmol : null),
  );
  const tgHdl = tgPair ? tgPair.a / tgPair.b : null;

  const glucose = latest(entries, (e) => e.fasting_glucose_mmol);
  const insulin = latest(entries, (e) => e.fasting_insulin_uu);
  const hba1c = latest(entries, (e) => e.hba1c_pct);
  const waist = latest(entries, (e) => e.waist_cm);
  const waistHeight =
    waist.value != null && heightCm && heightCm > 0
      ? waist.value / heightCm
      : null;

  const homaStatus = classifyLowerIsBetter(homaIr, 1.9, 2.9);
  const glucoseStatus = classifyLowerIsBetter(glucose.value, 5.6, 7.0);
  const hba1cStatus = classifyLowerIsBetter(hba1c.value, 5.7, 6.5);
  const insulinStatus = classifyLowerIsBetter(insulin.value, 10, 15);
  const tgHdlStatus = classifyLowerIsBetter(tgHdl, 0.87, 1.3);
  const waistHeightStatus = classifyLowerIsBetter(waistHeight, 0.5, 0.6);

  const readings: Reading[] = [
    {
      key: "homa_ir",
      label: "HOMA-IR",
      value: homaIr,
      unit: "",
      display: fmt(homaIr, 1),
      status: homaStatus,
      note: NOTE[homaStatus].homa_ir,
      recordedOn: homaPair?.on ?? null,
    },
    {
      key: "tg_hdl",
      label: "TG : HDL",
      value: tgHdl,
      unit: "",
      display: fmt(tgHdl, 2),
      status: tgHdlStatus,
      note: NOTE[tgHdlStatus].tg_hdl,
      recordedOn: tgPair?.on ?? null,
    },
    {
      key: "glucose",
      label: "Fasting glucose",
      value: glucose.value,
      unit: " mmol/L",
      display: fmt(glucose.value, 1),
      status: glucoseStatus,
      note: NOTE[glucoseStatus].glucose,
      recordedOn: glucose.on,
    },
    {
      key: "hba1c",
      label: "HbA1c",
      value: hba1c.value,
      unit: "%",
      display: fmt(hba1c.value, 1),
      status: hba1cStatus,
      note: NOTE[hba1cStatus].hba1c,
      recordedOn: hba1c.on,
    },
    {
      key: "insulin",
      label: "Fasting insulin",
      value: insulin.value,
      unit: " µU/mL",
      display: fmt(insulin.value, 1),
      status: insulinStatus,
      note: NOTE[insulinStatus].insulin,
      recordedOn: insulin.on,
    },
    {
      key: "waist_height",
      label: "Waist-to-height",
      value: waistHeight,
      unit: "",
      display: fmt(waistHeight, 2),
      status: waistHeightStatus,
      note: NOTE[waistHeightStatus].waist_height,
      recordedOn: waist.on,
    },
  ];

  const seriesMap: Record<string, { x: string; y: number }[]> = {
    glucose: series(asc, (e) => e.fasting_glucose_mmol),
    insulin: series(asc, (e) => e.fasting_insulin_uu),
    hba1c: series(asc, (e) => e.hba1c_pct),
    triglycerides: series(asc, (e) => e.triglycerides_mmol),
    hdl: series(asc, (e) => e.hdl_mmol),
    waist: series(asc, (e) => e.waist_cm),
    homa_ir: series(asc, (e) =>
      e.fasting_glucose_mmol != null && e.fasting_insulin_uu != null
        ? Math.round((e.fasting_glucose_mmol * e.fasting_insulin_uu / HOMA_DIVISOR) * 100) / 100
        : null,
    ),
    tg_hdl: series(asc, (e) =>
      e.triglycerides_mmol != null && e.hdl_mmol != null && e.hdl_mmol > 0
        ? Math.round((e.triglycerides_mmol / e.hdl_mmol) * 100) / 100
        : null,
    ),
  };

  return {
    entries,
    latestOn: entries[0]?.recorded_on ?? null,
    readings,
    series: seriesMap,
    heightCm,
    remindersEnabled: Boolean(profile?.metabolic_reminders_enabled),
  };
}
