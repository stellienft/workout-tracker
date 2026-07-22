import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const preferredRegion = ["syd1"];

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Handles the email-confirmation / OAuth (Google) code-exchange redirect.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const next = searchParams.get("next") ?? "/onboarding";

  // The provider bounced back without a code (user cancelled, or a config
  // problem). Nothing to exchange — send them back to sign in.
  if (oauthError || !code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Build the destination redirect up front and write the freshly-minted
  // session cookies straight onto it. Returning a *separate* NextResponse
  // (the previous approach) dropped those Set-Cookie headers, so the browser
  // never got the session and the protected page bounced back to /login.
  const response = NextResponse.redirect(`${origin}${next}`);

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
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  return response;
}
