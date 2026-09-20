import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Canonical host: send www → apex. The app, its metadata and the auth
  // redirect allowlist all live on the apex domain, so keeping everyone on one
  // origin avoids split auth cookies and OAuth redirect mismatches.
  const host = request.headers.get("host");
  if (host === "www.stellio.fit") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = "stellio.fit";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
