import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFreshAccessToken, fetchCurrentlyPlaying } from "@/lib/spotify";

export const dynamic = "force-dynamic";

/** Current track for the signed-in member (polled by the workout widget). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false }, { status: 401 });

  const token = await getFreshAccessToken(user.id);
  if (!token) return NextResponse.json({ connected: false });

  const track = await fetchCurrentlyPlaying(token);
  if (!track) return NextResponse.json({ connected: true, playing: null });

  return NextResponse.json({ connected: true, playing: track });
}
