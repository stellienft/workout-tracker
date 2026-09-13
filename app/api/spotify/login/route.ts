import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import {
  buildAuthUrl,
  spotifyConfigured,
  SPOTIFY_STATE_COOKIE,
  SPOTIFY_RETURN_COOKIE,
} from "@/lib/spotify";

export const dynamic = "force-dynamic";

function siteOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

/** Kick off the Spotify OAuth connect flow. */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  if (!spotifyConfigured()) {
    return NextResponse.redirect(`${origin}/settings?spotify=unconfigured`);
  }

  const state = randomUUID();
  // Where to send the member back to after connecting (defaults to settings).
  const rawReturn = new URL(request.url).searchParams.get("return") ?? "/settings";
  const safeReturn = rawReturn.startsWith("/") ? rawReturn : "/settings";

  const res = NextResponse.redirect(buildAuthUrl(origin, state));
  const cookie = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set(SPOTIFY_STATE_COOKIE, state, cookie);
  res.cookies.set(SPOTIFY_RETURN_COOKIE, safeReturn, cookie);
  return res;
}
