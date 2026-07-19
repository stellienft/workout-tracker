import { createClient } from "@/lib/supabase/server";
import { isoDate } from "@/lib/utils";

export interface HealthMetricDef {
  id: string;
  key: string;
  name: string;
  category: "symptom" | "vital" | "lifestyle" | "wellbeing";
  input_type: "scale" | "number" | "boolean";
  scale_min: number;
  scale_max: number;
  unit: string | null;
  medication_related: boolean;
  display_order: number;
}

export interface Tracker {
  id: string; // user_health_metrics.id
  name: string;
  category: string;
  inputType: "scale" | "number" | "boolean";
  scaleMin: number;
  scaleMax: number;
  unit: string | null;
  metricId: string | null;
  custom: boolean;
  todayValue: number | null;
  todayBool: boolean | null;
}

export interface HealthData {
  trackers: Tracker[];
  catalog: HealthMetricDef[];
  enabledMetricIds: Set<string>;
}

interface UHMRow {
  id: string;
  metric_id: string | null;
  custom_name: string | null;
  custom_input_type: "scale" | "number" | "boolean" | null;
  custom_scale_min: number | null;
  custom_scale_max: number | null;
  custom_unit: string | null;
  display_order: number;
  metric: HealthMetricDef | null;
}

export async function getHealthData(userId: string): Promise<HealthData> {
  const supabase = await createClient();
  const today = isoDate(new Date());

  const [{ data: catalog, error: catErr }, { data: uhm }] = await Promise.all([
    supabase
      .from("health_metrics")
      .select("*")
      .eq("active", true)
      .order("display_order"),
    supabase
      .from("user_health_metrics")
      .select("*, metric:health_metrics(*)")
      .eq("user_id", userId)
      .eq("enabled", true)
      .order("display_order"),
  ]);

  // Tables not migrated yet (or transient error): degrade gracefully.
  if (catErr) {
    return { trackers: [], catalog: [], enabledMetricIds: new Set() };
  }

  const rows = (uhm ?? []) as unknown as UHMRow[];

  // Today's values for the enabled trackers.
  const ids = rows.map((r) => r.id);
  const todayByTracker = new Map<string, { v: number | null; b: boolean | null }>();
  if (ids.length) {
    const { data: logs } = await supabase
      .from("health_logs")
      .select("user_health_metric_id, value_numeric, value_bool")
      .eq("user_id", userId)
      .eq("logged_on", today)
      .in("user_health_metric_id", ids);
    for (const l of logs ?? [])
      todayByTracker.set(l.user_health_metric_id as string, {
        v: l.value_numeric as number | null,
        b: l.value_bool as boolean | null,
      });
  }

  const trackers: Tracker[] = rows.map((r) => {
    const m = r.metric;
    const inputType = (m?.input_type ?? r.custom_input_type ?? "scale") as
      | "scale"
      | "number"
      | "boolean";
    const t = todayByTracker.get(r.id);
    return {
      id: r.id,
      name: m?.name ?? r.custom_name ?? "Metric",
      category: m?.category ?? "symptom",
      inputType,
      scaleMin: m?.scale_min ?? r.custom_scale_min ?? 0,
      scaleMax: m?.scale_max ?? r.custom_scale_max ?? 10,
      unit: m?.unit ?? r.custom_unit ?? null,
      metricId: r.metric_id,
      custom: !r.metric_id,
      todayValue: t?.v ?? null,
      todayBool: t?.b ?? null,
    };
  });

  const enabledMetricIds = new Set(
    rows.map((r) => r.metric_id).filter(Boolean) as string[]
  );

  return {
    trackers,
    catalog: (catalog ?? []) as HealthMetricDef[],
    enabledMetricIds,
  };
}

/** Recent history (default 30 days) for one tracker, oldest → newest. */
export async function getTrackerHistory(
  userId: string,
  userHealthMetricId: string,
  days = 30
) {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from("health_logs")
    .select("logged_on, value_numeric, value_bool")
    .eq("user_id", userId)
    .eq("user_health_metric_id", userHealthMetricId)
    .gte("logged_on", isoDate(since))
    .order("logged_on");
  return data ?? [];
}
