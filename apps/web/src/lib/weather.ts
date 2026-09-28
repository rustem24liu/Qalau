import { fromWmo, isDayPhase, isWeatherKind, type DayPhase, type Weather, type WeatherKind } from "@qalau/core";
import { create } from "zustand";

type Status = "idle" | "locating" | "loading" | "ready" | "denied" | "error";
interface Coords { lat: number; lon: number }

/** "auto" = real weather at the user's location, "manual" = picked in the settings. */
export type WeatherMode = "auto" | "manual";
export interface ManualWeather { kind: WeatherKind; phase: DayPhase; intensity: number }
interface Settings { mode: WeatherMode; manual: ManualWeather }

interface WeatherStore extends Settings {
  status: Status;
  /** Last real weather, kept while in manual mode too. */
  weather: Weather | null;
  /** Clock for the day phase; ticks once a minute. */
  now: number;
  setMode(mode: WeatherMode): void;
  setManual(patch: Partial<ManualWeather>): void;
  tick(): void;
  /** On startup: use saved coordinates or an already granted permission, never prompt. */
  init(): Promise<void>;
  /** From a user gesture: asks for the location, then loads the weather. */
  locate(): Promise<void>;
  refresh(): Promise<void>;
}

const GEO_KEY = "qalau-geo", WX_KEY = "qalau-weather";
/** Weather older than this is refetched. */
export const WEATHER_TTL = 20 * 60_000;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, v: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}

/** ~1 km precision is plenty for weather and keeps the exact position out of storage. */
const round = (x: number) => Math.round(x * 100) / 100;

function position(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("no geolocation"));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: round(p.coords.latitude), lon: round(p.coords.longitude) }),
      reject,
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60 * 60_000 },
    );
  });
}

async function geoGranted(): Promise<boolean> {
  try {
    return (await navigator.permissions.query({ name: "geolocation" })).state === "granted";
  } catch {
    return false;
  }
}

interface OpenMeteo {
  utc_offset_seconds: number;
  current: { temperature_2m: number; weather_code: number; is_day: number };
  daily: { sunrise: string[]; sunset: string[] };
}

async function fetchWeather({ lat, lon }: Coords): Promise<Weather> {
  const url = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${lat}&longitude=${lon}`
    + "&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset&timezone=auto&forecast_days=1";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const d: OpenMeteo = await res.json();
  // sunrise / sunset come as local wall time ("2026-09-28T06:52") of the location
  const toEpoch = (s?: string) => {
    const t = s ? Date.parse(s + "Z") : NaN;
    return Number.isFinite(t) ? t - d.utc_offset_seconds * 1000 : null;
  };
  return {
    ...fromWmo(d.current.weather_code),
    temp: Math.round(d.current.temperature_2m),
    sunrise: toEpoch(d.daily.sunrise[0]),
    sunset: toEpoch(d.daily.sunset[0]),
    isDay: d.current.is_day === 1,
    at: Date.now(),
  };
}

const SETTINGS_KEY = "qalau-weather-settings";
const DEFAULT_MANUAL: ManualWeather = { kind: "clear", phase: "day", intensity: 0.7 };

/** `?wx=rain&phase=night&i=0.5` opens manual mode with that weather, without saving it (for demos). */
function demoSettings(): Settings | null {
  const q = new URLSearchParams(location.search);
  const kind = q.get("wx"), phase = q.get("phase") ?? "day", i = Number(q.get("i") ?? DEFAULT_MANUAL.intensity);
  if (!isWeatherKind(kind) || !isDayPhase(phase)) return null;
  return { mode: "manual", manual: { kind, phase, intensity: Number.isFinite(i) ? Math.min(1, Math.max(0, i)) : DEFAULT_MANUAL.intensity } };
}

function savedSettings(): Settings {
  const s = read<Partial<Settings>>(SETTINGS_KEY);
  const m = s?.manual;
  return {
    mode: s?.mode === "manual" ? "manual" : "auto",
    manual: {
      kind: isWeatherKind(m?.kind) ? m.kind : DEFAULT_MANUAL.kind,
      phase: isDayPhase(m?.phase) ? m.phase : DEFAULT_MANUAL.phase,
      intensity: DEFAULT_MANUAL.intensity,
    },
  };
}

const initial = demoSettings() ?? savedSettings();
const cached = read<Weather>(WX_KEY);

export const useWeather = create<WeatherStore>()((set, get) => {
  async function load(coords: Coords) {
    if (!get().weather) set({ status: "loading" });
    try {
      const weather = await fetchWeather(coords);
      write(WX_KEY, weather);
      set({ weather, status: "ready", now: Date.now() });
    } catch {
      // keep showing the last known weather if there is one
      set({ status: get().weather ? "ready" : "error" });
    }
  }

  const persist = () => {
    const { mode, manual } = get();
    write(SETTINGS_KEY, { mode, manual });
  };

  return {
    ...initial,
    status: cached ? "ready" : "idle",
    weather: cached,
    now: Date.now(),

    setMode(mode) {
      set({ mode });
      persist();
      if (mode === "auto") get().init();
    },

    setManual(patch) {
      set({ manual: { ...get().manual, ...patch } });
      persist();
    },

    tick: () => set({ now: Date.now() }),

    async init() {
      if (get().mode !== "auto") return;
      let coords = read<Coords>(GEO_KEY);
      if (await geoGranted()) {
        try {
          coords = await position();
          write(GEO_KEY, coords);
        } catch {}
      }
      if (!coords) return;
      const w = get().weather;
      if (!w || Date.now() - w.at > WEATHER_TTL) await load(coords);
    },

    async locate() {
      set({ status: "locating" });
      let coords: Coords;
      try {
        coords = await position();
      } catch (e) {
        const denied = (e as GeolocationPositionError)?.code === 1;
        set({ status: denied ? "denied" : "error" });
        return;
      }
      write(GEO_KEY, coords);
      await load(coords);
    },

    async refresh() {
      if (get().mode !== "auto") return;
      const coords = read<Coords>(GEO_KEY);
      if (coords) await load(coords);
    },
  };
});
