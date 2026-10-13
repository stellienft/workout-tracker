import { createClient } from "@/lib/supabase/server";

export interface LeaderboardRow {
  userId: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  completedSessions: number;
  activeDays: number;
  rank: number;
  isMe: boolean;
}

export interface MyStanding {
  rank: number;
  participants: number;
  points: number;
  completedSessions: number;
  activeDays: number;
  totalSets: number;
  totalVolumeKg: number;
  prepSessions: number;
  optedIn: boolean;
  isMinor: boolean;
  /** Top percentile, 1–100 (1 = best). Null when alone or unranked. */
  percentile: number | null;
}

/** Top N of the current week, within the viewer's age segment (opted-in only). */
export async function getLeaderboardTop(limit = 50): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("leaderboard_top", { p_limit: limit });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    userId: r.user_id as string,
    name: (r.full_name as string | null)?.trim() || "Athlete",
    avatarUrl: (r.avatar_url as string | null) ?? null,
    points: (r.points as number) ?? 0,
    completedSessions: (r.completed_sessions as number) ?? 0,
    activeDays: (r.active_days as number) ?? 0,
    rank: Number(r.rank ?? 0),
    isMe: Boolean(r.is_me),
  }));
}

/** The viewer's own standing this week, or null if they haven't scored yet. */
export async function getMyStanding(): Promise<MyStanding | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("leaderboard_me");
  if (error || !data || (data as unknown[]).length === 0) return null;
  const r = (data as Record<string, unknown>[])[0];
  const rank = Number(r.rank ?? 0);
  const participants = Number(r.participants ?? 0);
  return {
    rank,
    participants,
    points: (r.points as number) ?? 0,
    completedSessions: (r.completed_sessions as number) ?? 0,
    activeDays: (r.active_days as number) ?? 0,
    totalSets: (r.total_sets as number) ?? 0,
    totalVolumeKg: Number(r.total_volume_kg ?? 0),
    prepSessions: (r.prep_sessions as number) ?? 0,
    optedIn: Boolean(r.opted_in),
    isMinor: Boolean(r.is_minor),
    percentile:
      participants > 1 ? Math.max(1, Math.round((rank / participants) * 100)) : null,
  };
}

/** Whether the viewer currently appears on the board (profile flag). */
export async function getLeaderboardOptIn(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("leaderboard_opt_in")
    .eq("id", user.id)
    .maybeSingle();
  return (data?.leaderboard_opt_in as boolean | undefined) ?? true;
}

/** Whether the viewer's name is masked on the board (profile flag). */
export async function getLeaderboardNameHidden(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("leaderboard_name_hidden")
    .eq("id", user.id)
    .maybeSingle();
  return (data?.leaderboard_name_hidden as boolean | undefined) ?? false;
}
