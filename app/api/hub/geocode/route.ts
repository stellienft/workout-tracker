import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geocode } from "@/lib/hub/weather";

export const dynamic = "force-dynamic";

/** Resolve a typed place name to coordinates for the hub's saved location. */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = new URL(req.url).searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ error: "Missing q" }, { status: 400 });

  const place = await geocode(query);
  if (!place) return NextResponse.json({ place: null });
  return NextResponse.json({ place });
}
