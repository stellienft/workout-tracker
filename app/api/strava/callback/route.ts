import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCode,
  storeTokens,
  STRAVA_STATE_COOKIE,
  STRAVA_RETURN_COOKIE,
} from "@/lib/strava";
import { syncStravaActivities } from "@/lib/actions/strava";

export const dynamic = "force-dynamic";

function siteOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

/** Strava redirects here after the member approves (or denies) access. */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const scope = searchParams.get("scope") ?? undefined;

  const stateCookie = request.cookies.get(STRAVA_STATE_COOKIE)?.value;
  const returnTo = request.cookies.get(STRAVA_RETURN_COOKIE)?.value ?? "/activities";
  const back = (status: string) =>
    `${origin}${returnTo}${returnTo.includes("?") ? "&" : "?"}strava=${status}`;
  const clear = (res: NextResponse) => {
    res.cookies.delete(STRAVA_STATE_COOKIE);
    res.cookies.delete(STRAVA_RETURN_COOKIE);
    return res;
  };

  if (error) return clear(NextResponse.redirect(back("denied")));
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return clear(NextResponse.redirect(back("error")));
  }
  // Require the activity read scope — without it there's nothing to import.
  if (!scope || !scope.includes("activity:read")) {
    return clear(NextResponse.redirect(back("noscope")));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return clear(NextResponse.redirect(`${origin}/login`));

  const tokens = await exchangeCode(code);
  if (!tokens?.access_token || !tokens.refresh_token) {
    return clear(NextResponse.redirect(back("error")));
  }

  await storeTokens(user.id, tokens, scope);
  // Pull in recent activities right away so the page isn't empty.
  await syncStravaActivities().catch(() => {});

  return clear(NextResponse.redirect(back("connected")));
}
