export type WeatherKind = "clear" | "clouds" | "overcast" | "fog" | "drizzle" | "rain" | "snow" | "storm";
export type DayPhase = "morning" | "day" | "evening" | "night";

export interface Weather {
  kind: WeatherKind;
  /** 0..1, how dense the rain / snow is. */
  intensity: number;
  /** °C */
  temp: number;
  /** Epoch ms; null in polar day / night. */
  sunrise: number | null;
  sunset: number | null;
  /** Fallback for polar regions, where there is no sunrise or sunset. */
  isDay: boolean;
  /** Epoch ms when fetched. */
  at: number;
}

export const WEATHER_LABEL: Record<WeatherKind, string> = {
  clear: "Ясно",
  clouds: "Облачно",
  overcast: "Пасмурно",
  fog: "Туман",
  drizzle: "Морось",
  rain: "Дождь",
  snow: "Снег",
  storm: "Гроза",
};

export const WEATHER_KINDS = Object.keys(WEATHER_LABEL) as WeatherKind[];

export const PHASE_LABEL: Record<DayPhase, string> = {
  morning: "утро",
  day: "день",
  evening: "вечер",
  night: "ночь",
};

export const DAY_PHASES = Object.keys(PHASE_LABEL) as DayPhase[];

export const isWeatherKind = (k: unknown): k is WeatherKind => typeof k === "string" && k in WEATHER_LABEL;
export const isDayPhase = (p: unknown): p is DayPhase => typeof p === "string" && p in PHASE_LABEL;

/** WMO weather interpretation code (as used by Open-Meteo) → kind and intensity. */
export function fromWmo(code: number): { kind: WeatherKind; intensity: number } {
  if (code === 0 || code === 1) return { kind: "clear", intensity: 0 };
  if (code === 2) return { kind: "clouds", intensity: 0 };
  if (code === 3) return { kind: "overcast", intensity: 0 };
  if (code === 45 || code === 48) return { kind: "fog", intensity: 0 };
  if (code >= 51 && code <= 57) return { kind: "drizzle", intensity: code % 10 >= 5 ? 0.5 : 0.3 };
  if (code === 61 || code === 66 || code === 80) return { kind: "rain", intensity: 0.4 };
  if (code === 63 || code === 81) return { kind: "rain", intensity: 0.7 };
  if (code === 65 || code === 67 || code === 82) return { kind: "rain", intensity: 1 };
  if (code === 71 || code === 77 || code === 85) return { kind: "snow", intensity: 0.4 };
  if (code === 73) return { kind: "snow", intensity: 0.7 };
  if (code === 75 || code === 86) return { kind: "snow", intensity: 1 };
  if (code >= 95) return { kind: "storm", intensity: 1 };
  return { kind: "clouds", intensity: 0 };
}

const MIN = 60_000;

/** Morning: from 30 min before sunrise to 1 h after. Evening: from 1 h before sunset to 45 min after. */
export function dayPhase(w: Pick<Weather, "sunrise" | "sunset" | "isDay">, now = Date.now()): DayPhase {
  const { sunrise, sunset } = w;
  if (sunrise == null || sunset == null) return w.isDay ? "day" : "night";
  if (now < sunrise - 30 * MIN || now > sunset + 45 * MIN) return "night";
  if (now < sunrise + 60 * MIN) return "morning";
  if (now > sunset - 60 * MIN) return "evening";
  return "day";
}
