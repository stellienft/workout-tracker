"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  disconnect,
  getConnection,
  getFreshAccessToken,
  fetchActivities,
  markSynced,
  stravaConfigured,
  type StravaActivity,
} from "@/lib/strava";

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getStravaStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  lastSyncedAt: string | null;
}> {
  const configured = stravaConfigured();
  const { user } = await currentUser();
  if (!configured || !user) return { configured, connected: false, lastSyncedAt: null };
  const conn = await getConnection(user.id);
  return { configured, connected: conn.connected, lastSyncedAt: conn.lastSyncedAt };
}

export async function disconnectStrava() {
  const { user } = await currentUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  await disconnect(user.id);
  revalidatePath("/settings");
  revalidatePath("/activities");
  return { ok: true as const };
}

function mapActivity(userId: string, a: StravaActivity) {
  return {
    user_id: userId,
    source: "strava",
    external_id: String(a.id),
    activity_type: a.sport_type || a.type || "Activity",
    name: a.name ?? null,
    distance_m: a.distance ?? null,
    moving_time_s: a.moving_time ?? null,
    elapsed_time_s: a.elapsed_time ?? null,
    elevation_m: a.total_elevation_gain ?? null,
    average_hr: a.average_heartrate ?? null,
    max_hr: a.max_heartrate ?? null,
    average_speed: a.average_speed ?? null,
    start_at: a.start_date ?? new Date().toISOString(),
  };
}

/**
 * Pull the member's recent Strava activities into Stellio. Only fetches
 * activities newer than the latest one already imported (falling back to the
 * last ~90 days on a first sync), and upserts so re-running never duplicates.
 */
export async function syncStravaActivities(): Promise<
  { ok: true; imported: number } | { ok: false; error: string }
> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const token = await getFreshAccessToken(user.id);
  if (!token) return { ok: false as const, error: "Strava isn't connected." };

  // Only fetch what's new since the most recent activity we already hold.
  const { data: latest } = await supabase
    .from("external_activities")
    .select("start_at")
    .eq("user_id", user.id)
    .eq("source", "strava")
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const after = latest?.start_at
    ? Math.floor(new Date(latest.start_at as string).getTime() / 1000)
    : Math.floor((Date.now() - 90 * 86_400_000) / 1000); // first sync: last 90 days

  const PER_PAGE = 50;
  const MAX_PAGES = 6; // cap a first sync at ~300 activities
  const rows: ReturnType<typeof mapActivity>[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await fetchActivities(token, { page, perPage: PER_PAGE, after });
    if (batch === null)
      return { ok: false as const, error: "Couldn't reach Strava. Please try again." };
    for (const a of batch) if (a?.id) rows.push(mapActivity(user.id, a));
    if (batch.length < PER_PAGE) break;
  }

  let imported = 0;
  if (rows.length > 0) {
    const { data, error } = await supabase
      .from("external_activities")
      .upsert(rows, { onConflict: "user_id,source,external_id", ignoreDuplicates: false })
      .select("id");
    if (error) return { ok: false as const, error: error.message };
    imported = data?.length ?? rows.length;
  }

  await markSynced(user.id);
  revalidatePath("/activities");
  revalidatePath("/dashboard");
  return { ok: true as const, imported };
}
