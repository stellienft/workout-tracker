import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/progress/print-button";
import type { ScanPlan } from "@/lib/actions/body-composition";

export const metadata = { title: "Scan report" };

const METRICS: { key: string; label: string; unit?: string }[] = [
  { key: "weight_kg", label: "Weight", unit: "kg" },
  { key: "body_fat_pct", label: "Body fat", unit: "%" },
  { key: "muscle_mass_kg", label: "Muscle / lean mass", unit: "kg" },
  { key: "visceral_fat_level", label: "Visceral fat" },
  { key: "basal_metabolic_rate", label: "BMR", unit: "kcal" },
  { key: "bmi", label: "BMI" },
  { key: "protein_kg", label: "Protein", unit: "kg" },
  { key: "water_pct", label: "Water", unit: "%" },
  { key: "left_arm_mass_kg", label: "Left arm lean", unit: "kg" },
  { key: "right_arm_mass_kg", label: "Right arm lean", unit: "kg" },
  { key: "trunk_mass_kg", label: "Trunk lean", unit: "kg" },
  { key: "left_leg_mass_kg", label: "Left leg lean", unit: "kg" },
  { key: "right_leg_mass_kg", label: "Right leg lean", unit: "kg" },
];

export default async function ScanReportPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { scanId } = await params;
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: scan } = await supabase
    .from("body_composition_scans")
    .select("*")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!scan) notFound();

  const s = scan as Record<string, unknown>;
  const plan = (s.ai_plan as ScanPlan | null) ?? null;
  const shown = METRICS.filter((m) => s[m.key] != null);
  const date = s.scan_date ? new Date(String(s.scan_date)).toLocaleDateString("en-AU") : "";
  const num = (v: unknown, dp = 1) => Number(v).toFixed(dp);

  return (
    <div className="report">
      <style>{`
        .report { max-width: 760px; margin: 0 auto; padding: 40px 28px 64px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: #111; background: #fff; }
        .report h1 { font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
        .report h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.08em;
          color: #666; margin: 28px 0 10px; }
        .report .muted { color: #666; font-size: 13px; }
        .report .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .report .tile { border: 1px solid #e3e3e0; border-radius: 10px; padding: 12px; }
        .report .tile .v { font-size: 18px; font-weight: 700; }
        .report .tile .l { font-size: 11px; color: #666; }
        .report .plan p { font-size: 14px; line-height: 1.55; margin: 6px 0; }
        .report ol { padding-left: 18px; }
        .report li { font-size: 14px; margin: 6px 0; }
        .report .rule { border: none; border-top: 1px solid #e3e3e0; margin: 24px 0; }
        .report .brand { color: #6a7f00; font-weight: 800; }
        .report .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        @media print { .no-print { display: none !important; } .report { padding: 0; } }
      `}</style>

      <div className="head">
        <div>
          <p className="brand">Aries Fitness</p>
          <h1>Body Composition Report</h1>
          <p className="muted">
            {s.source ? String(s.source).toUpperCase() : "Scan"}
            {date ? ` · ${date}` : ""}
          </p>
        </div>
        <PrintButton />
      </div>

      <h2>Measurements</h2>
      <div className="grid">
        {shown.map((m) => (
          <div className="tile" key={m.key}>
            <div className="v">
              {num(s[m.key], m.unit === "kcal" ? 0 : 1)}
              {m.unit ? <span style={{ fontSize: 11, color: "#666" }}> {m.unit}</span> : null}
            </div>
            <div className="l">{m.label}</div>
          </div>
        ))}
      </div>

      {plan && (
        <div className="plan">
          <hr className="rule" />
          <h2>Training focus</h2>
          <p style={{ fontSize: 18, fontWeight: 700 }}>{plan.headline}</p>
          {plan.summary && <p>{plan.summary}</p>}

          {plan.flags.length > 0 && (
            <ul>
              {plan.flags.map((f, i) => (
                <li key={i} style={{ color: "#9a6a00" }}>⚠ {f}</li>
              ))}
            </ul>
          )}

          {plan.priorities.length > 0 && (
            <>
              <h2>Priorities</h2>
              <ol>
                {plan.priorities.map((p, i) => (
                  <li key={i}>
                    <strong>{p.title}.</strong> {p.detail}
                  </li>
                ))}
              </ol>
            </>
          )}

          {(plan.split || plan.cardio || plan.nutrition) && (
            <>
              <h2>Plan</h2>
              {plan.split && <p><strong>Training:</strong> {plan.split}</p>}
              {plan.cardio && <p><strong>Cardio:</strong> {plan.cardio}</p>}
              {plan.nutrition && <p><strong>Nutrition:</strong> {plan.nutrition}</p>}
            </>
          )}

          {plan.macros && (
            <p>
              <strong>Suggested daily targets:</strong> {plan.macros.calories} kcal ·{" "}
              {plan.macros.protein_g}g protein · {plan.macros.carbs_g}g carbs ·{" "}
              {plan.macros.fat_g}g fat
            </p>
          )}
        </div>
      )}

      <hr className="rule" />
      <p className="muted">
        Generated by Aries Fitness
        {s.ai_plan_generated_at
          ? ` on ${new Date(String(s.ai_plan_generated_at)).toLocaleDateString("en-AU")}`
          : ""}
        . A training guide, not medical advice.
      </p>
    </div>
  );
}
