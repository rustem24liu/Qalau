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
