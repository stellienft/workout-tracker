"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serviceSupabase } from "@/lib/push";

// User-owned tables to include in a personal-data export, with the column that
// scopes a row to the member. RLS already limits reads to the user's own rows;
// each query is best-effort so a missing table/column just omits that section.
const EXPORT_TABLES: { table: string; column: string }[] = [
  { table: "workout_sessions", column: "user_id" },
  { table: "set_logs", column: "user_id" },
  { table: "program_enrolments", column: "user_id" },
  { table: "saved_programs", column: "user_id" },
  { table: "custom_splits", column: "user_id" },
  { table: "body_metrics", column: "user_id" },
  { table: "body_composition_scans", column: "user_id" },
  { table: "progress_photos", column: "user_id" },
  { table: "checkins", column: "user_id" },
  { table: "pain_reports", column: "user_id" },
  { table: "daily_wellness", column: "user_id" },
  { table: "weekly_recaps", column: "user_id" },
  { table: "user_achievements", column: "user_id" },
  { table: "user_goals", column: "user_id" },
  { table: "health_logs", column: "user_id" },
  { table: "user_health_metrics", column: "user_id" },
  { table: "medication_logs", column: "user_id" },
  { table: "meal_entries", column: "user_id" },
  { table: "nutrition_targets", column: "user_id" },
  { table: "notifications", column: "user_id" },
  { table: "social_posts", column: "user_id" },
  { table: "social_comments", column: "user_id" },
  { table: "social_reactions", column: "user_id" },
  { table: "exercise_favorites", column: "user_id" },
  { table: "recipe_favorites", column: "user_id" },
  { table: "coaching_sessions", column: "client_id" },
];

export type ExportResult =
  | { ok: true; data: Record<string, unknown>; filename: string }
  | { ok: false; error: string };

/**
 * Assemble a JSON export of the member's own data. Read through the
 * RLS-scoped client so only their rows are ever returned.
 */
export async function exportMyData(): Promise<ExportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const bundle: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  bundle.profile = profile ?? null;

  for (const { table, column } of EXPORT_TABLES) {
    const { data, error } = await supabase.from(table).select("*").eq(column, user.id);
    if (!error) bundle[table] = data ?? [];
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return { ok: true, data: bundle, filename: `stellio-fit-data-${stamp}.json` };
}

/**
 * Permanently delete the signed-in member's account. Deleting the auth user
 * cascades to every table that references auth.users on delete, then we clear
 * the session and send them to the login screen.
 */
export async function deleteMyAccount(): Promise<{ ok: false; error: string } | never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Best-effort: remove the member's uploaded files so nothing is orphaned.
  for (const bucket of ["progress-photos", "body-scans", "avatars"]) {
    try {
      const { data: files } = await supabase.storage.from(bucket).list(user.id);
      if (files && files.length) {
        await supabase.storage
          .from(bucket)
          .remove(files.map((f) => `${user.id}/${f.name}`));
      }
    } catch {
      // ignore — a missing bucket or empty folder is fine
    }
  }

  const admin = serviceSupabase();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: error.message };

  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}
