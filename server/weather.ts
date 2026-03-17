/**
 * Weather Integration for Clear The Clutter Analytics
 *
 * Uses Open-Meteo API (free, no key required) for historical and forecast weather.
 * Oshkosh, WI coordinates: 44.0247° N, 88.5426° W
 *
 * Provides:
 * - Daily weather data (temp, precip, snow, wind, weather code) for last 30-90 days
 * - Severe weather detection (blizzards, heavy rain, extreme cold/heat)
 * - Weather impact scoring for business analytics
 * - AI insights integration (correlate weather with traffic/bookings)
 */
import { storage } from "./storage";

const OSHKOSH_LAT = 44.0247;
const OSHKOSH_LON = -88.5426;
const CACHE_TTL = 360; // 6 hours — weather history doesn't change

// WMO Weather Codes → human-readable + severity
const WEATHER_CODES: Record<number, { label: string; icon: string; severity: number }> = {
  0: { label: "Clear", icon: "☀️", severity: 0 },
  1: { label: "Mostly Clear", icon: "🌤", severity: 0 },
  2: { label: "Partly Cloudy", icon: "⛅", severity: 0 },
  3: { label: "Overcast", icon: "☁️", severity: 0 },
  45: { label: "Fog", icon: "🌫", severity: 1 },
  48: { label: "Freezing Fog", icon: "🌫", severity: 2 },
  51: { label: "Light Drizzle", icon: "🌦", severity: 0 },
  53: { label: "Drizzle", icon: "🌦", severity: 1 },
  55: { label: "Heavy Drizzle", icon: "🌧", severity: 1 },
  61: { label: "Light Rain", icon: "🌧", severity: 1 },
  63: { label: "Rain", icon: "🌧", severity: 1 },
  65: { label: "Heavy Rain", icon: "🌧", severity: 2 },
  66: { label: "Freezing Rain", icon: "🌧", severity: 3 },
  67: { label: "Heavy Freezing Rain", icon: "🌧", severity: 3 },
  71: { label: "Light Snow", icon: "🌨", severity: 1 },
  73: { label: "Snow", icon: "🌨", severity: 2 },
  75: { label: "Heavy Snow", icon: "❄️", severity: 3 },
  77: { label: "Snow Grains", icon: "❄️", severity: 1 },
  80: { label: "Light Showers", icon: "🌦", severity: 1 },
  81: { label: "Showers", icon: "🌧", severity: 1 },
  82: { label: "Heavy Showers", icon: "⛈", severity: 2 },
  85: { label: "Snow Showers", icon: "🌨", severity: 2 },
  86: { label: "Heavy Snow Showers", icon: "❄️", severity: 3 },
  95: { label: "Thunderstorm", icon: "⛈", severity: 2 },
  96: { label: "Thunderstorm + Hail", icon: "⛈", severity: 3 },
  99: { label: "Thunderstorm + Heavy Hail", icon: "⛈", severity: 3 },
};

export interface DailyWeather {
  date: string;
  tempMax: number; // °F
  tempMin: number;
  tempMean: number;
  precipitation: number; // inches
  snowfall: number; // inches
  windMax: number; // mph
  weatherCode: number;
  weatherLabel: string;
  weatherIcon: string;
  severity: number; // 0=fine, 1=mild, 2=moderate, 3=severe
  businessImpact: string; // "good" | "mild" | "moderate" | "severe"
}

function celsiusToFahr(c: number): number {
  return Math.round((c * 9 / 5 + 32) * 10) / 10;
}

function mmToInches(mm: number): number {
  return Math.round(mm / 25.4 * 100) / 100;
}

function cmToInches(cm: number): number {
  return Math.round(cm / 2.54 * 100) / 100;
}

function kmhToMph(kmh: number): number {
  return Math.round(kmh * 0.621371 * 10) / 10;
}

function getBusinessImpact(severity: number, tempMax: number, snowfall: number, windMax: number): string {
  // Severe weather = likely no-shows and cancellations
  if (severity >= 3 || snowfall > 6 || windMax > 45) return "severe";
  if (severity >= 2 || snowfall > 2 || windMax > 35 || tempMax < 10 || tempMax > 100) return "moderate";
  if (severity >= 1 || snowfall > 0 || windMax > 25 || tempMax < 20 || tempMax > 95) return "mild";
  return "good";
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fetch Weather Data
// ═══════════════════════════════════════════════════════════════════════════════

export async function getWeatherHistory(days = 30): Promise<{ configured: true; days: DailyWeather[]; summary: any } | { error: string }> {
  const cacheKey = `weather-${days}`;
  const cached = await storage.getCachedAnalytics("weather", cacheKey);
  if (cached) return cached;

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // Open-Meteo historical weather API — free, no key needed
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${OSHKOSH_LAT}&longitude=${OSHKOSH_LON}&start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}&daily=weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,snowfall_sum,wind_speed_10m_max&temperature_unit=celsius&precipitation_unit=mm&wind_speed_unit=kmh&timezone=America/Chicago`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Open-Meteo API ${res.status}: ${text}`);
    }

    const data = await res.json();
    const daily = data.daily;
    if (!daily || !daily.time) throw new Error("No daily weather data returned");

    const weatherDays: DailyWeather[] = daily.time.map((date: string, i: number) => {
      const code = daily.weather_code[i] ?? 0;
      const info = WEATHER_CODES[code] ?? { label: "Unknown", icon: "❓", severity: 0 };
      const tempMaxF = celsiusToFahr(daily.temperature_2m_max[i] ?? 0);
      const tempMinF = celsiusToFahr(daily.temperature_2m_min[i] ?? 0);
      const snowInches = cmToInches(daily.snowfall_sum[i] ?? 0);
      const windMph = kmhToMph(daily.wind_speed_10m_max[i] ?? 0);

      return {
        date,
        tempMax: tempMaxF,
        tempMin: tempMinF,
        tempMean: celsiusToFahr(daily.temperature_2m_mean[i] ?? 0),
        precipitation: mmToInches(daily.precipitation_sum[i] ?? 0),
        snowfall: snowInches,
        windMax: windMph,
        weatherCode: code,
        weatherLabel: info.label,
        weatherIcon: info.icon,
        severity: info.severity,
        businessImpact: getBusinessImpact(info.severity, tempMaxF, snowInches, windMph),
      };
    });

    // Generate summary
    const severeDays = weatherDays.filter(d => d.businessImpact === "severe").length;
    const moderateDays = weatherDays.filter(d => d.businessImpact === "moderate").length;
    const goodDays = weatherDays.filter(d => d.businessImpact === "good").length;
    const snowDays = weatherDays.filter(d => d.snowfall > 0).length;
    const totalSnow = weatherDays.reduce((s, d) => s + d.snowfall, 0);
    const avgTemp = weatherDays.reduce((s, d) => s + d.tempMean, 0) / weatherDays.length;

    const summary = {
      period: `${formatDate(startDate)} to ${formatDate(endDate)}`,
      totalDays: weatherDays.length,
      goodDays,
      mildDays: weatherDays.filter(d => d.businessImpact === "mild").length,
      moderateDays,
      severeDays,
      snowDays,
      totalSnowfall: Math.round(totalSnow * 10) / 10,
      avgTemp: Math.round(avgTemp),
      coldestDay: weatherDays.reduce((min, d) => d.tempMin < min.tempMin ? d : min, weatherDays[0]),
      hottestDay: weatherDays.reduce((max, d) => d.tempMax > max.tempMax ? d : max, weatherDays[0]),
      worstWeatherDay: weatherDays.reduce((worst, d) => d.severity > worst.severity ? d : worst, weatherDays[0]),
    };

    const result = { configured: true as const, days: weatherDays, summary };
    await storage.setCachedAnalytics("weather", cacheKey, result, CACHE_TTL);
    return result;
  } catch (e: any) {
    console.error("Weather fetch error:", e.message);
    return { error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Weather for AI Insights (condensed format)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getWeatherForAI() {
  const data = await getWeatherHistory(30);
  if ("error" in data) return null;

  // Condense for AI prompt — only notable days and summary
  const notableDays = data.days.filter(d =>
    d.businessImpact === "severe" || d.businessImpact === "moderate" || d.snowfall > 1 || d.tempMax < 15 || d.tempMax > 95
  );

  return {
    summary: data.summary,
    notableWeatherDays: notableDays.map(d => ({
      date: d.date,
      weather: d.weatherLabel,
      tempHigh: d.tempMax,
      tempLow: d.tempMin,
      snow: d.snowfall > 0 ? `${d.snowfall}"` : null,
      wind: d.windMax > 25 ? `${d.windMax}mph` : null,
      impact: d.businessImpact,
    })),
  };
}
