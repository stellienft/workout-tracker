import "server-only";
import { serviceSupabase } from "@/lib/push";

/**
 * Strava integration helpers (OAuth Authorization Code flow).
 *
 * Needs STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in the environment, and the
 * redirect URI (`<origin>/api/strava/callback`) set as the "Authorization
 * Callback Domain" in the Strava API application settings. Read scope only.
 */

const AUTH_URL = "https://www.strava.com/oauth/authorize";
const TOKEN_URL = "https://www.strava.com/oauth/token";
const ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";

export const STRAVA_SCOPES = "read,activity:read_all";
export const STRAVA_STATE_COOKIE = "strava_oauth_state";
export const STRAVA_RETURN_COOKIE = "strava_oauth_return";

export function stravaConfigured(): boolean {
  return Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
}

export function redirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/strava/callback`;
}

export function buildAuthUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? "",
    redirect_uri: redirectUri(origin),
    response_type: "code",
    approval_prompt: "auto",
    scope: STRAVA_SCOPES,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number; // unix seconds
  athlete?: { id?: number };
  scope?: string;
}

export async function exchangeCode(code: string): Promise<TokenResponse | null> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.STRAVA_CLIENT_ID ?? "",
        client_secret: process.env.STRAVA_CLIENT_SECRET ?? "",
        code,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as TokenResponse;
  } catch {
    return null;
  }
}

async function refreshTokens(refreshToken: string): Promise<TokenResponse | null> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.STRAVA_CLIENT_ID ?? "",
        client_secret: process.env.STRAVA_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as TokenResponse;
  } catch {
    return null;
  }
}

export async function storeTokens(userId: string, tok: TokenResponse, scope?: string) {
  const svc = serviceSupabase();
  await svc.from("strava_accounts").upsert(
    {
      user_id: userId,
      athlete_id: tok.athlete?.id ? String(tok.athlete.id) : undefined,
      access_token: tok.access_token ?? "",
      refresh_token: tok.refresh_token ?? "",
      scope: tok.scope ?? scope ?? null,
      expires_at: new Date((tok.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

interface StoredAccount {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

/** Valid access token for a member, refreshing if it's within 5 min of expiry. */
export async function getFreshAccessToken(userId: string): Promise<string | null> {
  const svc = serviceSupabase();
  const { data } = await svc
    .from("strava_accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  const acct = data as StoredAccount | null;
  if (!acct) return null;

  if (new Date(acct.expires_at).getTime() - Date.now() > 5 * 60_000) {
    return acct.access_token;
  }
  if (!acct.refresh_token) return null;
  const refreshed = await refreshTokens(acct.refresh_token);
  if (!refreshed?.access_token) return acct.access_token;
  await storeTokens(userId, {
    ...refreshed,
    refresh_token: refreshed.refresh_token ?? acct.refresh_token,
  });
  return refreshed.access_token;
}

export async function isConnected(userId: string): Promise<boolean> {
  const svc = serviceSupabase();
  const { data } = await svc
    .from("strava_accounts")
    .select("user_id, last_synced_at")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function getConnection(
  userId: string
): Promise<{ connected: boolean; lastSyncedAt: string | null }> {
  const svc = serviceSupabase();
  const { data } = await svc
    .from("strava_accounts")
    .select("last_synced_at")
    .eq("user_id", userId)
    .maybeSingle();
  return { connected: Boolean(data), lastSyncedAt: (data?.last_synced_at as string) ?? null };
}

export async function markSynced(userId: string) {
  const svc = serviceSupabase();
  await svc
    .from("strava_accounts")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);
}

export async function disconnect(userId: string) {
  const svc = serviceSupabase();
  await svc.from("strava_accounts").delete().eq("user_id", userId);
}

export interface StravaActivity {
  id: number;
  name?: string;
  type?: string;
  sport_type?: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  total_elevation_gain?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_speed?: number;
  start_date?: string;
}

/**
 * Fetch a page of the athlete's activities, newest first. `after` (unix
 * seconds) limits to activities started after that time.
 */
export async function fetchActivities(
  accessToken: string,
  opts: { page?: number; perPage?: number; after?: number } = {}
): Promise<StravaActivity[] | null> {
  const params = new URLSearchParams({
    page: String(opts.page ?? 1),
    per_page: String(opts.perPage ?? 30),
  });
  if (opts.after) params.set("after", String(opts.after));
  try {
    const res = await fetch(`${ACTIVITIES_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? (data as StravaActivity[]) : [];
  } catch {
    return null;
  }
}
