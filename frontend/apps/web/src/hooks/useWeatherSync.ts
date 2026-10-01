import { dayPhase, type DayPhase, type WeatherKind } from "@qalau/core";
import { useEffect, useMemo } from "react";
import { useWeather, WEATHER_TTL } from "../lib/weather";

/** Loads the weather on start, keeps the day phase current and refetches stale weather. */
export function useWeatherSync(): void {
  useEffect(() => {
    const { init } = useWeather.getState();
    init();
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const { weather, tick, refresh } = useWeather.getState();
      tick();
      if (weather && Date.now() - weather.at > WEATHER_TTL) refresh();
    };
    const id = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
}

export interface WeatherView {
  kind: WeatherKind;
  intensity: number;
  /** °C; null for weather picked by hand. */
  temp: number | null;
  phase: DayPhase;
}

/** The weather to show: picked in the settings, or the real one; null while the real one is unknown. */
export function useWeatherView(): WeatherView | null {
  const mode = useWeather(s => s.mode);
  const manual = useWeather(s => s.manual);
  const weather = useWeather(s => s.weather);
  const now = useWeather(s => s.now);
  return useMemo(() => {
    if (mode === "manual") return { ...manual, temp: null };
    if (!weather) return null;
    return { kind: weather.kind, intensity: weather.intensity, temp: weather.temp, phase: dayPhase(weather, now) };
  }, [mode, manual, weather, now]);
}

/** Time of day to show, or null while unknown. */
export const useDayPhase = (): DayPhase | null => useWeatherView()?.phase ?? null;
