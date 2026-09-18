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

/**
 * Read scopes power the workout "now playing" strip; the modify/search scopes
 * power the home hub's voice control ("play Fleetwood Mac"). Members who
 * connected before the hub shipped hold only the read scopes — hasPlaybackScope
 * detects that so the UI can prompt a reconnect instead of failing silently.
 */
export const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-modify-playback-state",
  "playlist-read-private",
  "user-library-read",
  "user-top-read",
].join(" ");

/** Scopes required to control playback, as opposed to merely observing it. */
const PLAYBACK_SCOPE = "user-modify-playback-state";
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

// ---------------------------------------------------------------------------
// Playback control — used by the voice hub. Everything below needs Spotify
// Premium (the Web API refuses playback control on free accounts) and an active
// Spotify Connect device: on the hub tablet that is the Spotify app itself.
// ---------------------------------------------------------------------------

const API = "https://api.spotify.com/v1";

/** Whether the member's stored grant includes the playback-control scope. */
export async function hasPlaybackScope(userId: string): Promise<boolean> {
  const svc = serviceSupabase();
  const { data } = await svc
    .from("spotify_accounts")
    .select("scope")
    .eq("user_id", userId)
    .maybeSingle();
  const scope = (data as { scope: string | null } | null)?.scope ?? "";
  return scope.includes(PLAYBACK_SCOPE);
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  volumePercent: number | null;
}

/** Devices the account can currently play on (the tablet, a speaker, a phone). */
export async function listDevices(accessToken: string): Promise<SpotifyDevice[]> {
  try {
    const res = await fetch(`${API}/me/player/devices`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      devices?: {
        id: string | null;
        name: string;
        type: string;
        is_active: boolean;
        volume_percent: number | null;
      }[];
    };
    return (data.devices ?? [])
      .filter((d): d is typeof d & { id: string } => Boolean(d.id))
      .map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        isActive: d.is_active,
        volumePercent: d.volume_percent,
      }));
  } catch {
    return [];
  }
}

export interface SpotifyMatch {
  uri: string;
  /** Context URIs (album/artist/playlist) play as a queue; tracks play alone. */
  isContext: boolean;
  title: string;
  subtitle: string;
  imageUrl: string | null;
}

interface SearchImage { url?: string }
interface SearchArtist { name?: string }
interface SearchItem {
  uri?: string;
  name?: string;
  images?: SearchImage[];
  album?: { images?: SearchImage[]; name?: string };
  artists?: SearchArtist[];
  owner?: { display_name?: string };
}

/**
 * Best match for a spoken query. Searches several types at once and prefers
 * whichever the phrasing implies — "play the album X", "play X playlist" — and
 * otherwise an artist or track, which is what people usually mean.
 */
export async function searchSpotify(
  accessToken: string,
  query: string,
  market = "AU"
): Promise<SpotifyMatch | null> {
  const wantsAlbum = /\balbum\b/i.test(query);
  const wantsPlaylist = /\bplaylist\b/i.test(query);
  const wantsArtist = /\b(artist|music by|songs by|anything by)\b/i.test(query);
  const cleaned = query
    .replace(/\b(the\s+)?(album|playlist|artist|music by|songs by|anything by|radio)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;

  const params = new URLSearchParams({
    q: cleaned,
    type: "track,album,artist,playlist",
    limit: "5",
    market,
  });

  let data: Record<string, { items?: (SearchItem | null)[] }>;
  try {
    const res = await fetch(`${API}/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    data = (await res.json()) as Record<string, { items?: (SearchItem | null)[] }>;
  } catch {
    return null;
  }

  const first = (key: string): SearchItem | null =>
    (data[key]?.items ?? []).find((i): i is SearchItem => Boolean(i?.uri)) ?? null;

  // Order the candidate types by what the phrasing asked for.
  const order = wantsPlaylist
    ? ["playlists", "albums", "artists", "tracks"]
    : wantsAlbum
      ? ["albums", "artists", "tracks", "playlists"]
      : wantsArtist
        ? ["artists", "albums", "tracks", "playlists"]
        : ["tracks", "artists", "albums", "playlists"];

  for (const key of order) {
    const item = first(key);
    if (!item?.uri) continue;
    const image = item.images?.[0]?.url ?? item.album?.images?.[0]?.url ?? null;
    const artists = (item.artists ?? []).map((a) => a.name).filter(Boolean).join(", ");
    const subtitle =
      key === "tracks"
        ? artists
        : key === "albums"
          ? `Album · ${artists}`
          : key === "artists"
            ? "Artist"
            : `Playlist · ${item.owner?.display_name ?? "Spotify"}`;
    return {
      uri: item.uri,
      isContext: key !== "tracks",
      title: item.name ?? cleaned,
      subtitle,
      imageUrl: image,
    };
  }
  return null;
}

async function playerCall(
  accessToken: string,
  path: string,
  method: "PUT" | "POST",
  body?: unknown,
  deviceId?: string | null
): Promise<{ ok: boolean; status: number }> {
  const url = new URL(`${API}/me/player${path}`);
  if (deviceId) url.searchParams.set("device_id", deviceId);
  try {
    const res = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** Start playback of a track URI (or an album/artist/playlist context). */
export async function playUri(
  accessToken: string,
  match: Pick<SpotifyMatch, "uri" | "isContext">,
  deviceId?: string | null
) {
  const body = match.isContext
    ? { context_uri: match.uri }
    : { uris: [match.uri] };
  return playerCall(accessToken, "/play", "PUT", body, deviceId);
}

/** Resume whatever was last playing. */
export async function resumePlayback(accessToken: string, deviceId?: string | null) {
  return playerCall(accessToken, "/play", "PUT", undefined, deviceId);
}

export async function pausePlayback(accessToken: string, deviceId?: string | null) {
  return playerCall(accessToken, "/pause", "PUT", undefined, deviceId);
}

export async function skipNext(accessToken: string, deviceId?: string | null) {
  return playerCall(accessToken, "/next", "POST", undefined, deviceId);
}

export async function skipPrevious(accessToken: string, deviceId?: string | null) {
  return playerCall(accessToken, "/previous", "POST", undefined, deviceId);
}

/** Set device volume, 0-100. Not supported by every Connect device. */
export async function setVolume(
  accessToken: string,
  percent: number,
  deviceId?: string | null
) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return playerCall(
    accessToken,
    `/volume?volume_percent=${clamped}`,
    "PUT",
    undefined,
    deviceId
  );
}

/** Move playback to a device (used to claim the tablet's Spotify app). */
export async function transferPlayback(
  accessToken: string,
  deviceId: string,
  play = true
) {
  try {
    const res = await fetch(`${API}/me/player`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ device_ids: [deviceId], play }),
      cache: "no-store",
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** Current playback state, including the active device and volume. */
export async function fetchPlayerState(accessToken: string): Promise<{
  deviceId: string | null;
  deviceName: string | null;
  volumePercent: number | null;
  isPlaying: boolean;
} | null> {
  try {
    const res = await fetch(`${API}/me/player`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.status === 204 || !res.ok) return null;
    const data = (await res.json()) as {
      is_playing?: boolean;
      device?: { id?: string; name?: string; volume_percent?: number };
    };
    return {
      deviceId: data.device?.id ?? null,
      deviceName: data.device?.name ?? null,
      volumePercent: data.device?.volume_percent ?? null,
      isPlaying: Boolean(data.is_playing),
    };
  } catch {
    return null;
  }
}
