import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchWeather, geocode, glanceWeather, speakWeather } from "@/lib/hub/weather";
import type { WeatherWindow } from "@/lib/hub/intents";

export const dynamic = "force-dynamic";

const WINDOWS: WeatherWindow[] = ["now", "today", "tomorrow", "week"];

/**
 * Weather for the hub. Uses the member's saved hub location by default, or a
 * spoken place name ("what's the weather in Byron Bay"), which is geocoded.
 *
 * Returns both the structured report (for the ambient display) and the sentence
 * to speak, so the client never has to re-derive the phrasing.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const place = url.searchParams.get("place");
  const windowParam = url.searchParams.get("window") as WeatherWindow | null;
  const window: WeatherWindow =
    windowParam && WINDOWS.includes(windowParam) ? windowParam : "now";

  const { data: settings } = await supabase
    .from("hub_settings")
    .select("latitude, longitude, place_label, units")
    .eq("user_id", user.id)
    .maybeSingle();

  const units = (settings?.units as "metric" | "imperial") ?? "metric";

  let latitude: number | null = null;
  let longitude: number | null = null;
  let label = "";

  if (place) {
    const geo = await geocode(place);
    if (!geo) {
      return NextResponse.json({
        error: "unknown-place",
        spoken: `I couldn't find ${place}.`,
      });
    }
    latitude = geo.latitude;
    longitude = geo.longitude;
    label = geo.name;
  } else if (settings?.latitude != null && settings?.longitude != null) {
    latitude = Number(settings.latitude);
    longitude = Number(settings.longitude);
    label = (settings.place_label as string) || "your area";
  }

  if (latitude === null || longitude === null) {
    return NextResponse.json({
      error: "no-location",
      spoken: "Set a location in hub settings and I'll be able to check the weather.",
    });
  }

  const report = await fetchWeather(latitude, longitude, label, units);
  if (!report) {
    return NextResponse.json({
      error: "unavailable",
      spoken: "I couldn't reach the weather service just now.",
    });
  }

  return NextResponse.json({
    report,
    spoken: speakWeather(report, window),
    glance: glanceWeather(report),
  });
}
