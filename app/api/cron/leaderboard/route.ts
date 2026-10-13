import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Recompute the weekly leaderboard from training data. Wire to a Vercel cron
 * (see vercel.json). Authorised via the CRON_SECRET bearer token Vercel
 * attaches automatically, or a ?secret= query param for manual runs.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("authorization")?.replace("Bearer ", "") ??
    new URL(req.url).searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = serviceSupabase();
  const { error } = await supabase.rpc("refresh_leaderboard_current");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
