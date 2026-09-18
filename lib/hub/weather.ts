/**
 * Weather for the hub, via Open-Meteo.
 *
 * Open-Meteo is free and needs no API key, which matters for a device that
 * should keep working without anyone maintaining credentials on it.
 *
 * The WMO code mapping and the spoken-summary builders are pure so the phrasing
 * the hub reads aloud is unit-tested; only `fetchWeather` touches the network.
 */

import type { WeatherWindow } from "@/lib/hub/intents";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

/** WMO weather interpretation codes -> a phrase that reads well aloud. */
const WMO: Record<number, string> = {
  0: "clear",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "freezing fog",
  51: "drizzling lightly",
  53: "drizzling",
  55: "drizzling heavily",
  56: "freezing drizzle",
  57: "heavy freezing drizzle",
  61: "light rain",
  63: "raining",
  65: "raining heavily",
  66: "freezing rain",
  67: "heavy freezing rain",
  71: "snowing lightly",
  73: "snowing",
  75: "snowing heavily",
  77: "snow grains",
  80: "light showers",
  81: "showers",
  82: "heavy showers",
  85: "snow showers",
  86: "heavy snow showers",
  95: "thunderstorms",
  96: "thunderstorms with hail",
  99: "severe thunderstorms with hail",
};

export function describeCode(code: number): string {
  return WMO[code] ?? "unsettled";
}

/** Codes where a raincoat is the right call. */
export function isWet(code: number): boolean {
  return code >= 51 && code !== 77;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  code: number;
  humidity: number;
  windKph: number;
  isDay: boolean;
}

export interface DayForecast {
  date: string; // YYYY-MM-DD
  code: number;
  high: number;
  low: number;
  rainChance: number;
}

export interface WeatherReport {
  place: string;
  units: "metric" | "imperial";
  current: CurrentWeather;
  days: DayForecast[];
}

export interface GeoPlace {
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

/** Look a place name up so "what's the weather in Byron Bay" works. */
export async function geocode(query: string): Promise<GeoPlace | null> {
  try {
    const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
    const res = await fetch(url, { next: { revalidate: 86_400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string }[];
    };
    const hit = data.results?.[0];
    if (!hit) return null;
    return {
      name: hit.name,
      latitude: hit.latitude,
      longitude: hit.longitude,
      timezone: hit.timezone,
    };
  } catch {
    return null;
  }
}

/**
 * Current conditions plus a 7-day outlook. Cached for 10 minutes — the hub
 * polls, and the weather does not change faster than that.
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  place: string,
  units: "metric" | "imperial" = "metric"
): Promise<WeatherReport | null> {
  const imperial = units === "imperial";
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "7",
    temperature_unit: imperial ? "fahrenheit" : "celsius",
    wind_speed_unit: imperial ? "mph" : "kmh",
  });

  try {
    const res = await fetch(`${FORECAST_URL}?${params.toString()}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: Record<string, number>;
      daily?: Record<string, (number | string)[]>;
    };
    if (!data.current || !data.daily) return null;

    const daily = data.daily;
    const days: DayForecast[] = (daily.time as string[]).map((date, i) => ({
      date,
      code: Number(daily.weather_code?.[i] ?? 0),
      high: Math.round(Number(daily.temperature_2m_max?.[i] ?? 0)),
      low: Math.round(Number(daily.temperature_2m_min?.[i] ?? 0)),
      rainChance: Math.round(Number(daily.precipitation_probability_max?.[i] ?? 0)),
    }));

    return {
      place,
      units,
      current: {
        temperature: Math.round(data.current.temperature_2m ?? 0),
        feelsLike: Math.round(data.current.apparent_temperature ?? 0),
        code: Number(data.current.weather_code ?? 0),
        humidity: Math.round(data.current.relative_humidity_2m ?? 0),
        windKph: Math.round(data.current.wind_speed_10m ?? 0),
        isDay: Number(data.current.is_day ?? 1) === 1,
      },
      days,
    };
  } catch {
    return null;
  }
}

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/**
 * Turn a report into the sentence the hub speaks. Deliberately short — a
 * speaker reading a full forecast aloud is tedious.
 */
export function speakWeather(report: WeatherReport, window: WeatherWindow): string {
  const deg = report.units === "imperial" ? "degrees" : "degrees";
  const { current, days, place } = report;
  const today = days[0];

  if (window === "now") {
    const feels =
      Math.abs(current.feelsLike - current.temperature) >= 3
        ? `, feels like ${current.feelsLike}`
        : "";
    const rain =
      today && today.rainChance >= 40
        ? ` There's a ${today.rainChance} percent chance of rain today.`
        : "";
    return `It's ${current.temperature} ${deg} in ${place} and ${describeCode(current.code)}${feels}.${rain}`;
  }

  if (window === "today" && today) {
    return `Today in ${place}: ${describeCode(today.code)}, a high of ${today.high} and a low of ${today.low}${
      today.rainChance >= 20 ? `, with a ${today.rainChance} percent chance of rain` : ""
    }.`;
  }

  if (window === "tomorrow" && days[1]) {
    const t = days[1];
    return `Tomorrow in ${place}: ${describeCode(t.code)}, between ${t.low} and ${t.high} ${deg}${
      t.rainChance >= 20 ? `, with a ${t.rainChance} percent chance of rain` : ""
    }.`;
  }

  // Week: highlight the range and the wettest day rather than reading 7 lines.
  const week = days.slice(0, 7);
  const high = Math.max(...week.map((d) => d.high));
  const low = Math.min(...week.map((d) => d.low));
  const wettest = week.reduce((a, b) => (b.rainChance > a.rainChance ? b : a), week[0]);
  const rainLine =
    wettest.rainChance >= 40
      ? ` The wettest day looks like ${DAY_NAMES[new Date(`${wettest.date}T12:00:00`).getDay()]}, at ${wettest.rainChance} percent.`
      : " It looks mostly dry.";
  return `This week in ${place}: between ${low} and ${high} ${deg}.${rainLine}`;
}

/** One-line summary for the ambient display (not spoken). */
export function glanceWeather(report: WeatherReport): string {
  const unit = report.units === "imperial" ? "°F" : "°C";
  const today = report.days[0];
  const range = today ? ` · ${today.low}${unit}–${today.high}${unit}` : "";
  return `${report.current.temperature}${unit} ${describeCode(report.current.code)}${range}`;
}
