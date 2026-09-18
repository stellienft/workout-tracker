import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchPlayerState,
  getFreshAccessToken,
  hasPlaybackScope,
  listDevices,
  pausePlayback,
  playUri,
  resumePlayback,
  searchSpotify,
  setVolume,
  skipNext,
  skipPrevious,
  spotifyConfigured,
  transferPlayback,
} from "@/lib/spotify";

export const dynamic = "force-dynamic";

/**
 * Playback control for the voice hub.
 *
 * Spotify's Web API controls playback on a Connect *device* — it does not play
 * audio itself. On the hub tablet that device is the Spotify Android app, so
 * the flow is: find the device, remember its id in hub_settings, then send
 * play/pause/skip to it. Everything here needs Spotify Premium; the API returns
 * 403 for free accounts and we translate that into something speakable.
 */

type Action =
  | "devices"
  | "state"
  | "play"
  | "pause"
  | "resume"
  | "next"
  | "previous"
  | "volume"
  | "transfer";

interface Body {
  action?: Action;
  query?: string;
  deviceId?: string;
  volume?: number;
  /** Relative volume nudge from "turn it up"/"turn it down". */
  direction?: "up" | "down";
}

function speakableFailure(status: number): string {
  if (status === 404) {
    return "I couldn't find an active Spotify device. Open Spotify on the tablet and play something once, then try again.";
  }
  if (status === 403) {
    return "Spotify only allows playback control on Premium accounts.";
  }
  if (status === 401) {
    return "My Spotify connection expired. Reconnect it in hub settings.";
  }
  return "Spotify didn't accept that just now.";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!spotifyConfigured()) {
    return NextResponse.json({
      ok: false,
      spoken: "Spotify isn't configured on this server yet.",
    });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const action = body.action;
  if (!action) return NextResponse.json({ error: "Missing action" }, { status: 400 });

  const token = await getFreshAccessToken(user.id);
  if (!token) {
    return NextResponse.json({
      ok: false,
      needsConnect: true,
      spoken: "Connect Spotify in hub settings and I'll be able to play music.",
    });
  }

  // Read-only actions don't need the modify scope.
  if (action === "devices") {
    return NextResponse.json({ ok: true, devices: await listDevices(token) });
  }
  if (action === "state") {
    return NextResponse.json({ ok: true, state: await fetchPlayerState(token) });
  }

  if (!(await hasPlaybackScope(user.id))) {
    return NextResponse.json({
      ok: false,
      needsReconnect: true,
      spoken:
        "I can see your Spotify but I'm not allowed to control it yet. Reconnect Spotify in hub settings to grant playback control.",
    });
  }

  // Prefer an explicitly passed device, then the hub's saved one.
  const { data: settings } = await supabase
    .from("hub_settings")
    .select("spotify_device_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const deviceId = body.deviceId ?? (settings?.spotify_device_id as string | null) ?? null;

  switch (action) {
    case "play": {
      const query = body.query?.trim();
      if (!query) {
        const resumed = await resumePlayback(token, deviceId);
        return resumed.ok
          ? NextResponse.json({ ok: true, spoken: "Playing." })
          : NextResponse.json({ ok: false, spoken: speakableFailure(resumed.status) });
      }
      const match = await searchSpotify(token, query);
      if (!match) {
        return NextResponse.json({
          ok: false,
          spoken: `I couldn't find ${query} on Spotify.`,
        });
      }
      const result = await playUri(token, match, deviceId);
      if (!result.ok) {
        return NextResponse.json({ ok: false, match, spoken: speakableFailure(result.status) });
      }
      const what =
        match.subtitle && !match.subtitle.startsWith("Artist")
          ? `${match.title} by ${match.subtitle.replace(/^(Album|Playlist) · /, "")}`
          : match.title;
      return NextResponse.json({ ok: true, match, spoken: `Playing ${what}.` });
    }

    case "pause": {
      const result = await pausePlayback(token, deviceId);
      return NextResponse.json(
        result.ok
          ? { ok: true, spoken: "Paused." }
          : { ok: false, spoken: speakableFailure(result.status) }
      );
    }

    case "resume": {
      const result = await resumePlayback(token, deviceId);
      return NextResponse.json(
        result.ok
          ? { ok: true, spoken: "Playing." }
          : { ok: false, spoken: speakableFailure(result.status) }
      );
    }

    case "next": {
      const result = await skipNext(token, deviceId);
      return NextResponse.json(
        result.ok
          ? { ok: true, spoken: "Skipping." }
          : { ok: false, spoken: speakableFailure(result.status) }
      );
    }

    case "previous": {
      const result = await skipPrevious(token, deviceId);
      return NextResponse.json(
        result.ok
          ? { ok: true, spoken: "Going back." }
          : { ok: false, spoken: speakableFailure(result.status) }
      );
    }

    case "volume": {
      let target = body.volume;
      if (target === undefined && body.direction) {
        const state = await fetchPlayerState(token);
        const current = state?.volumePercent ?? 50;
        target = body.direction === "up" ? current + 15 : current - 15;
      }
      if (target === undefined) {
        return NextResponse.json({ ok: false, spoken: "I didn't catch the volume." });
      }
      const clamped = Math.max(0, Math.min(100, Math.round(target)));
      const result = await setVolume(token, clamped, deviceId);
      return NextResponse.json(
        result.ok
          ? { ok: true, volume: clamped, spoken: `Volume ${clamped} percent.` }
          : {
              ok: false,
              spoken:
                result.status === 403
                  ? "That Spotify device doesn't let me change its volume — use the tablet's own volume keys."
                  : speakableFailure(result.status),
            }
      );
    }

    case "transfer": {
      if (!body.deviceId) {
        return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
      }
      const result = await transferPlayback(token, body.deviceId, false);
      return NextResponse.json(
        result.ok
          ? { ok: true, spoken: "Switched device." }
          : { ok: false, spoken: speakableFailure(result.status) }
      );
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
