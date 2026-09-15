import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import {
  buildAuthUrl,
  stravaConfigured,
  STRAVA_STATE_COOKIE,
  STRAVA_RETURN_COOKIE,
} from "@/lib/strava";

export const dynamic = "force-dynamic";

function siteOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

/** Kick off the Strava OAuth connect flow. */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  if (!stravaConfigured()) {
    return NextResponse.redirect(`${origin}/settings?strava=unconfigured`);
  }

  const state = randomUUID();
  const rawReturn = new URL(request.url).searchParams.get("return") ?? "/activities";
  const safeReturn = rawReturn.startsWith("/") ? rawReturn : "/activities";

  const res = NextResponse.redirect(buildAuthUrl(origin, state));
  const cookie = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set(STRAVA_STATE_COOKIE, state, cookie);
  res.cookies.set(STRAVA_RETURN_COOKIE, safeReturn, cookie);
  return res;
}
