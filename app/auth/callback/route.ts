import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const preferredRegion = ["syd1"];

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Behind Vercel's proxy, request.url can carry an internal host, which would
// make us redirect (and set cookies) on the wrong origin. Prefer the forwarded
// host so everything lands on the real public domain.
function siteOrigin(request: NextRequest, fallback: string) {
  const host = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : fallback;
}

// Handles the email-confirmation / OAuth (Google) code-exchange redirect.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const base = siteOrigin(request, origin);
  const code = searchParams.get("code");
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  const next = searchParams.get("next") ?? "/onboarding";

  // The provider bounced back with an explicit error (cancelled, or a config
  // problem such as an unlisted redirect URL). Surface the reason.
  if (providerError) {
    return NextResponse.redirect(
      `${base}/login?error=auth&reason=${encodeURIComponent(providerError)}`
    );
  }
  if (!code) {
    return NextResponse.redirect(`${base}/login?error=auth&reason=missing_code`);
  }

  // Build the destination redirect up front and write the freshly-minted
  // session cookies straight onto it. Returning a *separate* NextResponse
  // dropped those Set-Cookie headers, so the browser never got the session and
  // the protected page bounced back to /login.
  const response = NextResponse.redirect(`${base}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${base}/login?error=auth&reason=${encodeURIComponent(error.message)}`
    );
  }

  return response;
}
