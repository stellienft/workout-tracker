import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCode,
  storeTokens,
  SPOTIFY_STATE_COOKIE,
  SPOTIFY_RETURN_COOKIE,
} from "@/lib/spotify";

export const dynamic = "force-dynamic";

function siteOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

/** Spotify redirects here after the member approves (or denies) access. */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const stateCookie = request.cookies.get(SPOTIFY_STATE_COOKIE)?.value;
  const returnTo = request.cookies.get(SPOTIFY_RETURN_COOKIE)?.value ?? "/settings";
  const back = (ok: string) =>
    `${origin}${returnTo}${returnTo.includes("?") ? "&" : "?"}spotify=${ok}`;

  const clearCookies = (res: NextResponse) => {
    res.cookies.delete(SPOTIFY_STATE_COOKIE);
    res.cookies.delete(SPOTIFY_RETURN_COOKIE);
    return res;
  };

  if (error) return clearCookies(NextResponse.redirect(back("denied")));
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return clearCookies(NextResponse.redirect(back("error")));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return clearCookies(NextResponse.redirect(`${origin}/login`));

  const tokens = await exchangeCode(code, origin);
  if (!tokens?.access_token || !tokens.refresh_token) {
    return clearCookies(NextResponse.redirect(back("error")));
  }

  await storeTokens(user.id, tokens);
  return clearCookies(NextResponse.redirect(back("connected")));
}
