import { createClient } from "@/lib/supabase/server";

// Exports the signed-in user's own data as JSON (RLS guarantees scoping).
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const format = new URL(request.url).searchParams.get("format") ?? "json";

  const [sessions, sets, metrics, checkins, medication] = await Promise.all([
    supabase.from("workout_sessions").select("*").eq("user_id", user.id),
    supabase.from("set_logs").select("*").eq("user_id", user.id),
    supabase.from("body_metrics").select("*").eq("user_id", user.id),
    supabase.from("checkins").select("*").eq("user_id", user.id),
    supabase.from("medication_logs").select("*").eq("user_id", user.id),
  ]);

  if (format === "csv") {
    // Simple CSV of set logs (the densest workout record).
    const rows = sets.data ?? [];
    const headers = [
      "created_at",
      "exercise_id",
      "set_number",
      "weight_kg",
      "reps",
      "rpe",
      "pain_level",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? ""))
          .join(",")
      ),
    ].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="stellio-fit-sets.csv"',
      },
    });
  }

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    workout_sessions: sessions.data ?? [],
    set_logs: sets.data ?? [],
    body_metrics: metrics.data ?? [],
    checkins: checkins.data ?? [],
    medication_logs: medication.data ?? [],
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="stellio-fit-export.json"',
    },
  });
}
