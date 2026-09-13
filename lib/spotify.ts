import "server-only";
import { serviceSupabase } from "@/lib/push";

/**
 * Spotify integration helpers (Authorization Code flow).
 *
 * Needs SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in the environment, and the
 * redirect URI (`<origin>/api/spotify/callback`) registered in the Spotify
 * developer dashboard. Only the "currently playing" read scope is requested.
 */

const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_URL =
  "https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode";

export const SPOTIFY_SCOPES = "user-read-currently-playing user-read-playback-state";
export const SPOTIFY_STATE_COOKIE = "spotify_oauth_state";
export const SPOTIFY_RETURN_COOKIE = "spotify_oauth_return";

export function spotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

export function redirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/spotify/callback`;
}

export function buildAuthUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: redirectUri(origin),
    scope: SPOTIFY_SCOPES,
    state,
    show_dialog: "false",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

function basicAuthHeader(): string {
  const raw = `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

interface TokenResponse {
  access_token: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  refresh_token?: string;
}

/** Exchange an authorization code for tokens (initial connect). */
export async function exchangeCode(
  code: string,
  origin: string
): Promise<TokenResponse | null> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri(origin),
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as TokenResponse;
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
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

interface StoredAccount {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

/** Persist a freshly-issued (or refreshed) token set for a member. */
export async function storeTokens(userId: string, tok: TokenResponse, refreshFallback?: string) {
  const svc = serviceSupabase();
  const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  await svc.from("spotify_accounts").upsert(
    {
      user_id: userId,
      access_token: tok.access_token,
      // Spotify omits refresh_token on refresh responses — keep the existing one.
      refresh_token: tok.refresh_token ?? refreshFallback ?? "",
      scope: tok.scope ?? null,
      token_type: tok.token_type ?? "Bearer",
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

/**
 * Return a valid access token for the member, refreshing (and persisting) it if
 * it is missing or about to expire. Null when the member hasn't connected.
 */
export async function getFreshAccessToken(userId: string): Promise<string | null> {
  const svc = serviceSupabase();
  const { data } = await svc
    .from("spotify_accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  const acct = data as StoredAccount | null;
  if (!acct) return null;

  const expiresSoon = new Date(acct.expires_at).getTime() - Date.now() < 60_000;
  if (!expiresSoon) return acct.access_token;

  if (!acct.refresh_token) return null;
  const refreshed = await refreshAccessToken(acct.refresh_token);
  if (!refreshed?.access_token) return acct.access_token; // fall back; may 401
  await storeTokens(userId, refreshed, acct.refresh_token);
  return refreshed.access_token;
}

export async function isConnected(userId: string): Promise<boolean> {
  const svc = serviceSupabase();
  const { data } = await svc
    .from("spotify_accounts")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function disconnect(userId: string) {
  const svc = serviceSupabase();
  await svc.from("spotify_accounts").delete().eq("user_id", userId);
}

export interface NowPlaying {
  isPlaying: boolean;
  title: string;
  artist: string;
  albumArt: string | null;
  trackUrl: string | null;
  progressMs: number;
  durationMs: number;
}

interface SpotifyItem {
  name?: string;
  duration_ms?: number;
  external_urls?: { spotify?: string };
  artists?: { name?: string }[];
  show?: { name?: string };
  album?: { images?: { url?: string }[] };
  images?: { url?: string }[];
}

/**
 * Fetch what the member is currently playing. Returns null when nothing is
 * active (Spotify 204) or the token is unusable, so callers can hide the widget.
 */
export async function fetchCurrentlyPlaying(accessToken: string): Promise<NowPlaying | null> {
  let res: Response;
  try {
    res = await fetch(NOW_PLAYING_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (res.status === 204 || res.status >= 400) return null;

  let data: { is_playing?: boolean; progress_ms?: number; item?: SpotifyItem } | null = null;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  const item = data?.item;
  if (!item?.name) return null;

  const albumArt =
    item.album?.images?.[0]?.url ?? item.images?.[0]?.url ?? null;
  const artist =
    (item.artists ?? []).map((a) => a.name).filter(Boolean).join(", ") ||
    item.show?.name ||
    "";

  return {
    isPlaying: Boolean(data?.is_playing),
    title: item.name,
    artist,
    albumArt,
    trackUrl: item.external_urls?.spotify ?? null,
    progressMs: data?.progress_ms ?? 0,
    durationMs: item.duration_ms ?? 0,
  };
}
