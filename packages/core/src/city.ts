import type { AppState } from "./types";

/** The big building in the middle of the user's city. */
export type Landmark = "baiterek" | "koktobe" | "townhall";

export interface City {
  /** As the user typed it. */
  name: string;
  landmark: Landmark;
}

export const LANDMARK_LABEL: Record<Landmark, string> = {
  baiterek: "Байтерек",
  koktobe: "Телебашня Кок-Тобе",
  townhall: "Ратуша",
};

export const CITY_SUGGESTIONS = ["Астана", "Алматы", "Шымкент", "Караганда"];

/** Tasks to finish (across all goals) for the landmark to be complete. */
export const LANDMARK_TASKS = 60;

const MATCH: [RegExp, Landmark][] = [
  [/астан|astana|нур-?султан|nur-?sultan|акмол|целиноград/i, "baiterek"],
  [/алмат|almaty|алма-?ата|alma-?ata/i, "koktobe"],
];

export const landmarkFor = (name: string): Landmark => MATCH.find(([re]) => re.test(name))?.[1] ?? "townhall";

/** City from the user's answer; null for an empty one. */
export function makeCity(name: string): City | null {
  const n = name.trim().replace(/\s+/g, " ").slice(0, 40);
  return n ? { name: n, landmark: landmarkFor(n) } : null;
}

export const isLandmark = (l: unknown): l is Landmark => typeof l === "string" && l in LANDMARK_LABEL;

/**
 * Finished work that raises the landmark: every checked task of regular goals,
 * plus every hut completed by daily goals (their checkmarks reset each day).
 */
export function cityPoints(s: AppState): number {
  return s.goals.reduce((n, g) => n + (g.type === "daily" ? g.built || 0 : g.tasks.filter(t => t.done).length), 0);
}

/** 0..1 — how much of the landmark stands. */
export const landmarkProgress = (s: AppState) => Math.min(1, cityPoints(s) / LANDMARK_TASKS);

/** City growth by finished work (cityPoints). Each level unlocks something new in the city. */
export interface CityLevel {
  name: string;
  /** Points needed. */
  from: number;
  /** What appears in the city at this level. */
  perk: string;
}

export const CITY_LEVELS: CityLevel[] = [
  { name: "Посёлок", from: 0, perk: "Площадь и первые дома" },
  { name: "Городок", from: 15, perk: "Фонари вдоль улиц" },
  { name: "Город", from: 40, perk: "Парк на свободных участках" },
  { name: "Большой город", from: 90, perk: "Фонтан на площади" },
  { name: "Мегаполис", from: 160, perk: "Небоскрёбы на окраинах" },
];

/** Index into CITY_LEVELS for this many points. */
export const cityLevel = (points: number) => CITY_LEVELS.reduce((lv, l, i) => (points >= l.from ? i : lv), 0);

/** Progress to the next level: points gained since this level, and needed for the next (null at the top). */
export function levelProgress(points: number): { level: number; into: number; need: number | null } {
  const level = cityLevel(points), next = CITY_LEVELS[level + 1];
  return { level, into: points - CITY_LEVELS[level].from, need: next ? next.from - CITY_LEVELS[level].from : null };
}
